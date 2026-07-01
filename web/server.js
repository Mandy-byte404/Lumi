/**
 * Lumi Backend — SAGE-powered Vocabulary Coaching Server
 *
 * Implements the Guidance-Execution-Scoring architecture from the SAGE framework
 * adapted for vocabulary learning. Uses DeepSeek API for all three model roles.
 */

const path = require("path");
const express = require("express");

// ── Load .env from project root ──────────────────────────────────────────────
const fs = require("fs");
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
    if (key.trim() && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// ═══════════════════════════════════════════════════════════════════════════════
// SAGE Knowledge Graph — Simplified in-memory implementation
// ═══════════════════════════════════════════════════════════════════════════════

class VocabKnowledgeGraph {
  constructor() {
    this.nodes = {};
    this.edges = {};
    this.interactions = [];
  }

  addNode(type, label, confidence = 0.6, attributes = {}) {
    const existing = this.findNode(type, label);
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.08);
      existing.decayRisk = Math.max(0, existing.decayRisk - 0.05);
      existing.evidenceCount += 1;
      existing.lastVerifiedAt = new Date().toISOString();
      return existing;
    }
    const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const node = {
      id,
      type,
      label,
      confidence,
      freshness: 1.0,
      decayRisk: 0.0,
      evidenceCount: 1,
      createdAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      attributes,
    };
    this.nodes[id] = node;
    return node;
  }

  addEdge(source, target, type, weight = 0.5) {
    for (const edge of Object.values(this.edges)) {
      if (edge.source === source && edge.target === target && edge.type === type) {
        edge.weight = Math.min(1, edge.weight + 0.05);
        edge.evidenceCount += 1;
        return edge;
      }
    }
    const id = `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const edge = { id, source, target, type, weight, confidence: 0.6, evidenceCount: 1 };
    this.edges[id] = edge;
    return edge;
  }

  findNode(type, label) {
    const normalized = label.trim().toLowerCase();
    for (const node of Object.values(this.nodes)) {
      if (node.type === type && node.label.trim().toLowerCase() === normalized) {
        return node;
      }
    }
    return null;
  }

  strategicView() {
    const nodes = Object.values(this.nodes)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12)
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        confidence: n.confidence,
        freshness: n.freshness,
        decayRisk: n.decayRisk,
      }));
    const edges = Object.values(this.edges).slice(0, 8);
    return { role: "strategic", nodes, edges, recentInteractions: this.interactions.slice(-3) };
  }

  recordInteraction(data) {
    const id = `i_${Date.now().toString(36)}`;
    this.interactions.push({ id, createdAt: new Date().toISOString(), ...data });
    if (this.interactions.length > 50) this.interactions = this.interactions.slice(-50);
    return id;
  }

  applyScoreUpdates(score) {
    const overall = Math.max(0, Math.min(1, score.overallScore || 0.5));
    const learningGain = Math.max(0, Math.min(1, score.learningGain || 0.5));

    for (const node of Object.values(this.nodes)) {
      node.confidence = Math.max(0, Math.min(1, node.confidence + 0.04 * (overall - 0.5)));
      node.decayRisk = Math.max(0, Math.min(1, node.decayRisk + 0.02 - 0.05 * learningGain));
    }

    for (const error of score.detectedErrors || []) {
      this.addNode("Error", error, 0.55);
    }
    for (const pref of score.learnedPreferences || []) {
      this.addNode("Preference", pref, 0.6);
    }
  }

  seedVocabProfile() {
    const user = this.addNode("User", "lumi_student", 0.9);
    const pref = this.addNode("Preference", "prefers Socratic question-based vocabulary coaching", 0.8);
    const goal = this.addNode("Goal", "master TOEFL vocabulary through sentence construction", 0.7);
    const skill = this.addNode("Skill", "basic sentence construction", 0.6);
    const error = this.addNode("Error", "tends to write sentences that are too simple or generic", 0.65);
    const strategy = this.addNode("Strategy", "socratic_vocab_coaching", 0.75);

    this.addEdge(user.id, pref.id, "prefers", 0.8);
    this.addEdge(user.id, goal.id, "has_goal", 0.7);
    this.addEdge(user.id, error.id, "weak_at", 0.65);
    this.addEdge(strategy.id, skill.id, "improves", 0.7);
  }
}

// Global KG instance — persists across requests for the session
const kg = new VocabKnowledgeGraph();
kg.seedVocabProfile();

// ── Guidance Note (in-memory Markdown profile) ───────────────────────────────
let guidanceNote = `# Vocabulary Learning Profile

## Stable Guidance Preferences
- Use Socratic questioning to guide vocabulary learning
- Ask one focused question at a time
- Connect vocabulary to TOEFL writing context

## Effective Strategies
- socratic_vocab_coaching: ask grammar/usage questions before giving corrections

## Strategies To Avoid
- (none)

## Learning Frictions
- (none)

## Evidence Log
- (none)
`;

const PLAN_TOOLS = [
  {
    route: "academic-discussion",
    tag: "Writing",
    label: "Academic Discussion",
    description: "TOEFL academic discussion writing draft, feedback, revision, and takeaway notes",
  },
  {
    route: "vocab",
    tag: "Vocabulary",
    label: "Vocabulary",
    description: "TOEFL vocabulary deck and sentence coaching",
  },
  {
    route: "speaking",
    tag: "Speaking",
    label: "Speaking Practice",
    description: "typed speaking response practice with coach feedback",
  },
  {
    route: "listening",
    tag: "Listening",
    label: "Pocket Listening",
    description: "short listening review tracks",
  },
  {
    route: "reading",
    tag: "Reading",
    label: "Reading Passage",
    description: "reading/problem set practice",
  },
  {
    route: "mock",
    tag: "Mock",
    label: "Mock Exam",
    description: "mock exam entry point",
  },
];

function fallbackDailyPlan(message = "") {
  const minutes = extractMinutes(message);
  const compact = minutes > 0 && minutes < 60;
  const plan = compact
    ? [
        ["12 min Academic Discussion", "Writing", "academic-discussion"],
        ["12 min Vocabulary Sentence", "Vocabulary", "vocab"],
        ["10 min Speaking Practice", "Speaking", "speaking"],
      ]
    : [
        ["20 min Academic Discussion", "Writing", "academic-discussion"],
        ["20 min Vocabulary Sentence", "Vocabulary", "vocab"],
        ["15 min Speaking Practice", "Speaking", "speaking"],
        ["15 min Pocket Listening", "Listening", "listening"],
        ["15 min Reading Passage", "Reading", "reading"],
      ];
  return plan.map(([title, tag, route], index) => ({
    title,
    tag,
    route,
    status: index === 0 ? "continue" : "unfinished",
    action: index === 0 ? "Continue" : "Start",
  }));
}

function extractMinutes(message) {
  const match = String(message || "").match(/(\d{1,3})\s*(min|minute|minutes|m|分钟)?/i);
  return match ? Number(match[1]) : 90;
}

function sanitizeDailyPlan(plan, message = "") {
  const allowedRoutes = new Set(PLAN_TOOLS.map((tool) => tool.route));
  const source = Array.isArray(plan) && plan.length ? plan : fallbackDailyPlan(message);
  return source.slice(0, 6).map((item, index) => {
    const route = normalizePlanRoute(item.route || item.tool || item.target);
    const tool = PLAN_TOOLS.find((entry) => entry.route === route) || PLAN_TOOLS[0];
    const status = ["continue", "unfinished", "complete"].includes(item.status) ? item.status : index === 0 ? "continue" : "unfinished";
    const action = item.action || (status === "complete" ? "Done" : status === "continue" ? "Continue" : "Start");
    return {
      title: String(item.title || `15 min ${tool.label}`).trim(),
      tag: String(item.tag || tool.tag),
      status,
      action: String(action),
      route: allowedRoutes.has(route) ? route : tool.route,
    };
  });
}

function normalizePlanRoute(route) {
  const value = String(route || "").toLowerCase().replaceAll("_", "-").trim();
  const aliases = {
    writing: "academic-discussion",
    academic: "academic-discussion",
    "academic-discussion": "academic-discussion",
    vocabulary: "vocab",
    vocab: "vocab",
    speaking: "speaking",
    listening: "listening",
    reading: "reading",
    problems: "reading",
    practice: "reading",
    mock: "mock",
    "mock-exam": "mock",
  };
  return aliases[value] || "academic-discussion";
}

function buildDailyPlanPrompt(message, currentPlan) {
  return `USER_REQUEST: ${message || "No specific request. Build a balanced TOEFL study plan for today."}

CURRENT_PLAN:
${JSON.stringify(currentPlan || [], null, 2)}

AVAILABLE_TOOLS:
${PLAN_TOOLS.map((tool) => `- route=${tool.route}; tag=${tool.tag}; label=${tool.label}; description=${tool.description}`).join("\n")}

Create a practical daily TOEFL todo plan using only AVAILABLE_TOOLS.
Rules:
- Return JSON only.
- Use 3 to 6 items.
- Respect any time budget in USER_REQUEST.
- Prefer a balanced mix across weak/important skills.
- Each item must be clickable by route, so route must be exactly one of: ${PLAN_TOOLS.map((tool) => tool.route).join(", ")}.
- Titles should include an approximate duration and task name.

Schema:
{
  "plan": [
    {
      "title": "20 min Academic Discussion",
      "tag": "Writing",
      "status": "continue | unfinished",
      "action": "Start | Continue",
      "route": "academic-discussion | vocab | speaking | listening | reading | mock"
    }
  ]
}`;
}

async function runDailyPlanModel(message, currentPlan) {
  const raw = await callDeepSeek(
    [
      {
        role: "system",
        content: "You are Lumi's AI study planner. Build concise TOEFL daily todo plans from the app's available tools. Return valid JSON only.",
      },
      { role: "user", content: buildDailyPlanPrompt(message, currentPlan) },
    ],
    "json"
  );
  return JSON.parse(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeepSeek API Client
// ═══════════════════════════════════════════════════════════════════════════════

async function callDeepSeek(messages, responseFormat = "text") {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const url = `${DEEPSEEK_API_BASE}/chat/completions`;
  const payload = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 800,
  };
  if (responseFormat === "json") {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAGE Model Roles — Vocabulary Learning Specialization
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Guidance Model ────────────────────────────────────────────────────────

const GUIDANCE_SYSTEM_PROMPT = `You are the Guidance Model in a personalized vocabulary learning agent (SAGE architecture).
You collaborate with an Execution Model through a compact Guidance Blueprint.

Your job:
- Read the target vocabulary word, the student's sentence attempt, their learning history (KG), and the guidance note.
- Select a personalization strategy for THIS specific interaction.
- Return ONLY a JSON object matching the requested schema.
- Do NOT write the final student-facing answer.

Available strategies:
- "grammar_correction": when the sentence has clear grammar errors
- "word_usage_refinement": when the word is used incorrectly or too literally
- "context_expansion": when the sentence is too simple/generic and needs richer context
- "toefl_sentence_upgrade": when grammar and usage are OK but the sentence needs TOEFL-level sophistication
- "socratic_exploration": when this is an early attempt and the student needs guided discovery
- "praise_and_extend": when the sentence is good and the student should be encouraged then challenged further`;

function buildGuidancePrompt(word, meaning, sentence, history, strategicView) {
  const historyText = history.length > 0
    ? history.map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.text}`).join("\n")
    : "(first attempt)";

  const kgText = strategicView.nodes.length > 0
    ? strategicView.nodes.map((n) => `- type=${n.type}; label=${n.label}; confidence=${n.confidence}`).join("\n")
    : "(empty)";

  return `TARGET_WORD: ${word}
WORD_MEANING: ${meaning}
STUDENT_SENTENCE: ${sentence}
CONVERSATION_TURN: ${Math.floor(history.length / 2) + 1}

CONVERSATION_HISTORY:
${historyText}

STRATEGIC_KG_VIEW:
${kgText}

GUIDANCE_NOTE:
${guidanceNote}

Return JSON with these keys:
{
  "task_intent": "what the student is trying to do",
  "strategy": { "name": "one of the available strategies", "rationale": "why this strategy" },
  "execution_constraints": {
    "must_do": ["list of things the execution model MUST do"],
    "must_not_do": ["list of things the execution model must NOT do"],
    "response_style": "how to respond"
  },
  "focus_area": "grammar | word_usage | context | toefl_style | exploration",
  "specific_issue": "the specific issue to address, if any",
  "question_hint": "a hint for what Socratic question to ask"
}`;
}

async function runGuidanceModel(word, meaning, sentence, history) {
  const strategicView = kg.strategicView();
  const prompt = buildGuidancePrompt(word, meaning, sentence, history, strategicView);

  try {
    const raw = await callDeepSeek(
      [
        { role: "system", content: GUIDANCE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      "json"
    );
    return JSON.parse(raw);
  } catch (err) {
    console.error("Guidance model error, using fallback:", err.message);
    return {
      task_intent: `Student is using "${word}" in a sentence`,
      strategy: { name: "socratic_exploration", rationale: "Fallback strategy" },
      execution_constraints: {
        must_do: ["Ask one focused Socratic question", "Guide the student to improve their sentence"],
        must_not_do: ["Give the answer directly", "Be overly critical"],
        response_style: "encouraging Socratic teacher",
      },
      focus_area: "exploration",
      specific_issue: null,
      question_hint: "Ask about word usage context",
    };
  }
}

// ── 2. Execution Model ──────────────────────────────────────────────────────

const EXECUTION_SYSTEM_PROMPT = `You are a Socratic vocabulary coach named Lumi in a TOEFL prep app.
You help students learn vocabulary by guiding them to write better sentences.

CRITICAL RULES:
- Ask ONE focused question at a time to guide the student.
- Do NOT give away the correct answer directly.
- Lead the student to discover issues through questions.
- Be warm, encouraging, but precise.
- Keep responses concise (2-4 sentences max).
- Connect vocabulary usage to TOEFL writing context when appropriate.
- If the student's sentence is good, praise specifically what works, then challenge them to go deeper.
- Respond in the same language the student uses (if they write in English, respond in English; if mixed, use English).
- Use natural, conversational tone — like a knowledgeable friend, not a textbook.`;

function buildExecutionPrompt(word, meaning, sentence, history, blueprint) {
  const historyText = history.length > 0
    ? history.map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.text}`).join("\n")
    : "(first message from student)";

  return `GUIDANCE_BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

TARGET_WORD: ${word}
WORD_MEANING: ${meaning}
STUDENT_SENTENCE: ${sentence}

CONVERSATION_HISTORY:
${historyText}

Based on the guidance blueprint, write your next coach response. Remember:
- Follow the strategy: ${blueprint.strategy?.name || "socratic_exploration"}
- Focus area: ${blueprint.focus_area || "exploration"}
- ${blueprint.specific_issue ? `Address this issue: ${blueprint.specific_issue}` : "Guide the student naturally"}
- Ask ONE question to help the student improve.`;
}

async function runExecutionModel(word, meaning, sentence, history, blueprint) {
  const prompt = buildExecutionPrompt(word, meaning, sentence, history, blueprint);

  try {
    const response = await callDeepSeek([
      { role: "system", content: EXECUTION_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);
    return response.trim();
  } catch (err) {
    console.error("Execution model error, using fallback:", err.message);
    return `Let's look at your sentence with "${word}". Can you tell me — does your sentence show the meaning "${meaning}" clearly? Try thinking about what specific situation or example would make the meaning obvious to a reader.`;
  }
}

// ── 3. Scoring Model ────────────────────────────────────────────────────────

const SCORING_SYSTEM_PROMPT = `You are a sentence quality scorer for a vocabulary learning system.
Evaluate the student's sentence and return ONLY a JSON object.

Score each dimension from 0.0 to 1.0:
- grammar_correctness: Is the sentence grammatically correct?
- word_usage_accuracy: Is the target word used correctly and naturally?
- context_richness: Does the sentence provide meaningful context? Is it specific, not generic?
- toefl_readiness: Would this sentence quality be acceptable in TOEFL writing?

Also provide:
- overall_score: weighted average (grammar 0.25, usage 0.3, context 0.25, toefl 0.2)
- is_acceptable: true if overall_score >= 0.7
- detected_errors: list of specific issues found
- suggestions: list of improvement suggestions
- learned_preferences: list of teaching style observations about this student
- feedback_summary: one-sentence overall assessment`;

function buildScoringPrompt(word, meaning, sentence, history) {
  return `TARGET_WORD: ${word}
WORD_MEANING: ${meaning}
STUDENT_SENTENCE: ${sentence}

CONVERSATION_HISTORY:
${history.map((m) => `${m.role === "user" ? "Student" : "Coach"}: ${m.text}`).join("\n") || "(none)"}

Return JSON with the scoring fields described in your instructions.`;
}

async function runScoringModel(word, meaning, sentence, history) {
  const prompt = buildScoringPrompt(word, meaning, sentence, history);

  try {
    const raw = await callDeepSeek(
      [
        { role: "system", content: SCORING_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      "json"
    );
    return JSON.parse(raw);
  } catch (err) {
    console.error("Scoring model error, using fallback:", err.message);
    const usesWord = sentence.toLowerCase().includes(word.toLowerCase());
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    const base = usesWord ? 0.6 : 0.3;
    const richness = wordCount > 10 ? 0.7 : wordCount > 6 ? 0.5 : 0.3;
    return {
      grammar_correctness: base,
      word_usage_accuracy: usesWord ? 0.6 : 0.2,
      context_richness: richness,
      toefl_readiness: base * 0.8,
      overall_score: (base + (usesWord ? 0.6 : 0.2) + richness + base * 0.8) / 4,
      is_acceptable: false,
      detected_errors: usesWord ? [] : [`The word "${word}" was not used in the sentence`],
      suggestions: ["Try to use the word in a specific, concrete situation"],
      learned_preferences: [],
      feedback_summary: "Fallback scoring — API was unavailable.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/lumi/daily-plan
 * AI-native planner for the TOEFL home todo list.
 *
 * Body: { message, currentPlan }
 * Returns: { plan, source }
 */
app.post("/api/lumi/daily-plan", async (req, res) => {
  const { message = "", currentPlan = [] } = req.body || {};
  try {
    const data = await runDailyPlanModel(message, currentPlan);
    res.json({
      plan: sanitizeDailyPlan(data.plan, message),
      source: "deepseek",
    });
  } catch (err) {
    console.error("daily-plan error, using fallback:", err.message);
    res.json({
      plan: sanitizeDailyPlan(fallbackDailyPlan(message), message),
      source: "fallback",
    });
  }
});

app.post("/api/lumi/speaking-coach", async (req, res) => {
  const { message = "" } = req.body || {};
  try {
    const reply = await callDeepSeek([
      {
        role: "system",
        content: "You are Lumi, a concise TOEFL speaking coach. Give one clear improvement point and one follow-up prompt in 2-3 sentences.",
      },
      { role: "user", content: message || "The student has not written an answer yet." },
    ]);
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error("speaking-coach error, using fallback:", err.message);
    res.json({
      reply: `Nice. Try answering with one clear reason, one example, and one closing sentence. Your prompt was: "${message || "today's topic"}".`,
    });
  }
});

app.post("/api/lumi/vocab-sentence-coach", async (req, res) => {
  const { word = "", meaning = "", sentence = "" } = req.body || {};
  try {
    const blueprint = await runGuidanceModel(word, meaning, sentence, []);
    const reply = await runExecutionModel(word, meaning, sentence, [], blueprint);
    res.json({ reply });
  } catch (err) {
    console.error("vocab-sentence-coach error, using fallback:", err.message);
    const usesWord = sentence.toLowerCase().includes(word.toLowerCase());
    const reply = usesWord
      ? `Good sentence. It uses "${word}" in context. Can you add one concrete detail so the meaning "${meaning}" becomes clearer?`
      : `Try using "${word}" directly in your sentence, then add a specific situation that shows the meaning: ${meaning}.`;
    res.json({ reply });
  }
});

/**
 * POST /api/sage/vocab-chat
 * Main SAGE pipeline: Guidance → Execution
 *
 * Body: { word, meaning, sentence, history: [{ role, text }] }
 * Returns: { reply, blueprint }
 */
app.post("/api/sage/vocab-chat", async (req, res) => {
  try {
    const { word, meaning, sentence, history = [] } = req.body;

    if (!word || !sentence) {
      return res.status(400).json({ error: "word and sentence are required" });
    }

    // Stage 1: Guidance Model — create blueprint
    const blueprint = await runGuidanceModel(word, meaning || "", sentence, history);

    // Stage 2: Execution Model — generate Socratic response
    const reply = await runExecutionModel(word, meaning || "", sentence, history, blueprint);

    // Record interaction in KG
    kg.recordInteraction({
      type: "vocab_chat",
      word,
      sentence,
      strategy: blueprint.strategy?.name,
      focusArea: blueprint.focus_area,
    });

    // Update KG with word node
    const wordNode = kg.addNode("VocabWord", word, 0.5, { meaning, lastPracticed: new Date().toISOString() });
    kg.addNode("Skill", `sentence_construction_${word}`, 0.4);

    res.json({ reply, blueprint });
  } catch (err) {
    console.error("vocab-chat error:", err);
    res.status(500).json({
      error: "Failed to generate response",
      reply: `Let's work with "${req.body?.word || "this word"}". Can you tell me what situation comes to mind when you think about its meaning? Try to describe a specific moment or example.`,
    });
  }
});

/**
 * POST /api/sage/vocab-score
 * Scoring pipeline: evaluate sentence quality and update KG
 *
 * Body: { word, meaning, sentence, history: [{ role, text }] }
 * Returns: { score }
 */
app.post("/api/sage/vocab-score", async (req, res) => {
  try {
    const { word, meaning, sentence, history = [] } = req.body;

    if (!word || !sentence) {
      return res.status(400).json({ error: "word and sentence are required" });
    }

    const score = await runScoringModel(word, meaning || "", sentence, history);

    // Apply score updates to KG
    kg.applyScoreUpdates({
      overallScore: score.overall_score,
      learningGain: score.is_acceptable ? 0.8 : 0.4,
      detectedErrors: score.detected_errors || [],
      learnedPreferences: score.learned_preferences || [],
    });

    // Update guidance note with evidence
    if (score.detected_errors?.length > 0) {
      guidanceNote = guidanceNote.replace(
        "## Learning Frictions\n- (none)",
        `## Learning Frictions\n- ${score.detected_errors.join("\n- ")}`
      );
    }

    res.json({ score });
  } catch (err) {
    console.error("vocab-score error:", err);
    res.status(500).json({ error: "Failed to score sentence" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  🌟 Lumi server running at http://localhost:${PORT}`);
  console.log(`  📚 SAGE vocabulary coaching: ${DEEPSEEK_API_KEY ? "ENABLED (DeepSeek)" : "DISABLED (no API key)"}`);
  console.log(`  📊 Knowledge Graph: ${Object.keys(kg.nodes).length} nodes, ${Object.keys(kg.edges).length} edges\n`);
});
