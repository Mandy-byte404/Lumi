const app = document.querySelector("#app");

const state = {
  app: "toefl",
  toeflPage: "home",
  toolPage: null,
  mascotMood: "smile",
  plan: getDefaultPlan(),
  completedPlanItems: {},
  userPlanInput: "60min",
  selectedVocabDeckIndex: null,
  currentWordIndex: 0,
  vocabSentenceDraft: "",
  vocabSentenceMessages: [],
  checkInCalendar: getPresetCheckInCalendar(),
  graphSkill: "",
  graphPath: [],
  academicStage: "draft",
  academicProgress: 0,
  academicDraft: getDefaultAcademicDraft(),
};

let academicProgressTimer = null;

const USE_REAL_API = false;
const API_ENDPOINTS = {
  dailyPlan: "/api/lumi/daily-plan",
  speakingCoach: "/api/lumi/speaking-coach",
  vocabDeckProgress: "/api/lumi/vocab-deck-progress",
  vocabSentenceCoach: "/api/lumi/vocab-sentence-coach",
  checkInCalendar: "/api/lumi/check-ins",
};

const lumiImages = {
  greet: {
    src: "assets/lumi-greet.png",
    alt: "Lumi smiling and winking",
  },
  thinking: {
    src: "assets/lumi-thinking.png",
    alt: "Lumi thinking about a study plan",
  },
  smile: {
    src: "assets/lumi-smile.png",
    alt: "Lumi celebrating the completed plan",
  },
};

const mockApi = {
  async getCheckInCalendar() {
    if (USE_REAL_API) {
      return postJson(API_ENDPOINTS.checkInCalendar, { month: "2026-06" });
    }
    return getPresetCheckInCalendar();
  },
  async buildDailyPlan(input) {
    if (USE_REAL_API) {
      return postJson(API_ENDPOINTS.dailyPlan, { message: input });
    }
    await wait(850);
    return getDefaultPlan();
  },
  async lumiReply(message) {
    if (USE_REAL_API) {
      const data = await postJson(API_ENDPOINTS.speakingCoach, { message });
      return data.reply;
    }
    await wait(500);
    return `Nice. Try answering with one clear reason, one example, and one closing sentence. Your prompt was: "${message || "today's topic"}".`;
  },
  async reviewVocabularySentence(word, meaning, sentence) {
    if (USE_REAL_API) {
      const data = await postJson(API_ENDPOINTS.vocabSentenceCoach, { word, meaning, sentence });
      return data.reply;
    }
    await wait(420);
    const normalized = sentence.toLowerCase();
    const usesWord = normalized.includes(word.toLowerCase());
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    if (!usesWord || wordCount < 7) {
      return [
        "Template feedback:",
        `Example: ${getVocabularyExample(word)}`,
        `Suggestion: Use "${word}" directly and add a clear situation, action, and result. Your sentence is strongest when it shows the meaning: ${meaning}.`,
      ].join("\n");
    }
    return [
      "Template feedback:",
      "Good sentence. It uses the target word in a clear context.",
      "Suggestion: Make it even more TOEFL-like by adding one concrete detail or cause-and-effect link.",
    ].join("\n");
  },
  async getVocabDeckProgress() {
    if (USE_REAL_API) {
      return postJson(API_ENDPOINTS.vocabDeckProgress, {});
    }
    await wait(260);
    return getPresetVocabDecks();
  },
};

const vocabDecks = getPresetVocabDecks();

function getDefaultAcademicDraft() {
  return "I think camera is very useful and meaningful, because it can help child to develop many abilities and make his life more colorful. When a child use camera, he must look around the world carefully. For example, he may see a flower, a dog, or a old man walking in the street. Before he has camera, maybe he never notice these things. Camera can also make children more creative. If a child only study books every day, he will become boring. But if he has a camera, he can take different pictures, such as sky, food, classmates and his parents. Maybe he can become a famous photographer in the future. Therefore, camera is the best gift for children’s development.";
}

function getDefaultPlan() {
  return [
    {
      title: "20min Academic Discussion",
      tag: "Writing",
      status: "unfinished",
      action: "Start",
      route: "academic-discussion",
    },
    {
      title: "20 min Take an Interview",
      tag: "Speaking",
      status: "unfinished",
      action: "Start",
      route: "speaking",
    },
    {
      title: "20 min Vocabulary",
      tag: "Vocabulary",
      status: "continue",
      action: "Continue",
      route: "vocab",
    },
  ];
}

function getPresetVocabDecks() {
  return [
    { name: "TOEFL Core 800", count: 800, learned: 286, mastered: 164, due: 42 },
    { name: "Academic Verbs", count: 180, learned: 96, mastered: 61, due: 18 },
    { name: "Campus Life Terms", count: 240, learned: 74, mastered: 35, due: 27 },
    { name: "Independent Speaking Set", count: 120, learned: 38, mastered: 21, due: 12 },
  ];
}

const studyWords = [
  { word: "resilient", meaning: "able to recover quickly from difficulty", imagePosition: "left center" },
  { word: "coherent", meaning: "logical and easy to understand", imagePosition: "center center" },
  { word: "substantiate", meaning: "to support with evidence", imagePosition: "right center" },
];

function getVocabularyExample(word) {
  const examples = {
    resilient: "The resilient student recovered from a low quiz score by changing her study routine and asking better questions.",
    coherent: "Her coherent explanation helped the group understand why the experiment produced unexpected results.",
    substantiate: "The professor uses survey data and recent research to substantiate his claim.",
  };
  return examples[word] || `A strong sentence uses "${word}" in a clear situation with a concrete result.`;
}

const problems = [
  "Reading Passage Set 01",
  "Listening Lecture Set 02",
  "Speaking Independent Task 01",
  "Writing Integrated Task 03",
  "Vocabulary in Context Set 04",
];

const tracks = [
  { title: "Campus Announcement", length: "02:40" },
  { title: "Biology Lecture", length: "04:15" },
  { title: "Office Hours Dialogue", length: "03:20" },
];

const skillOptions = [
  { id: "listening", label: "Listening" },
  { id: "speaking", label: "Speaking" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
];

const writingGraph = {
  id: "write",
  label: "Write",
  mastery: 86,
  children: [
    {
      id: "build-sentence",
      label: "Build a Sentence",
      mastery: 78,
      children: [
        { id: "word-order", label: "Word Order", mastery: 82 },
        { id: "question-formation", label: "Question Formation", mastery: 64 },
        { id: "embedded-questions", label: "Embedded Questions", mastery: 57 },
        { id: "clauses", label: "Clauses", mastery: 74 },
        { id: "agreement-tense", label: "Agreement / Tense", mastery: 68 },
        { id: "sentence-boundaries", label: "Sentence Boundaries", mastery: 49 },
      ],
    },
    {
      id: "email",
      label: "Write an Email",
      mastery: 73,
      children: [
        { id: "purpose", label: "Purpose", mastery: 75 },
        { id: "audience-tone", label: "Audience / Tone", mastery: 58 },
        { id: "required-details", label: "Required Details", mastery: 66 },
        { id: "organization", label: "Organization", mastery: 72 },
        { id: "conventions", label: "Conventions", mastery: 61 },
        { id: "concision", label: "Concision", mastery: 84 },
      ],
    },
    {
      id: "academic-discussion",
      label: "Write for an Academic Discussion",
      mastery: 69,
      children: [
        { id: "stance", label: "Stance", mastery: 82 },
        { id: "response-peers", label: "Response to Peers", mastery: 55 },
        { id: "support-example", label: "Support / Example", mastery: 62 },
        { id: "reasoning", label: "Reasoning", mastery: 51 },
        { id: "coherence", label: "Coherence", mastery: 73 },
        { id: "academic-tone", label: "Academic Tone", mastery: 47 },
      ],
    },
    {
      id: "core-competencies",
      label: "Core Competencies",
      mastery: 76,
      children: [
        { id: "grammar-accuracy", label: "Grammar Accuracy", mastery: 67 },
        { id: "discourse-structure", label: "Discourse Structure", mastery: 81 },
        { id: "argumentation", label: "Argumentation", mastery: 58 },
        { id: "language-quality", label: "Language Quality", mastery: 71 },
        { id: "task-fulfillment", label: "Task Fulfillment", mastery: 88 },
      ],
    },
    {
      id: "legacy-bank",
      label: "Legacy Material Bank",
      mastery: 66,
      children: [
        { id: "topic-ideas", label: "Topic Ideas", mastery: 72 },
        { id: "argument-patterns", label: "Argument Patterns", mastery: 59 },
        { id: "rhetorical-functions", label: "Rhetorical Functions", mastery: 81 },
        { id: "lexical-replacements", label: "Lexical Replacements", mastery: 52 },
        { id: "academic-collocations", label: "Academic Collocations", mastery: 46 },
        { id: "model-response", label: "Model Response Analysis", mastery: 68 },
      ],
    },
  ],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function goMain() {
  setState({ app: "main", toeflPage: "home", toolPage: null });
}

function goToefl(page = "home", toolPage = null) {
  setState({ app: "toefl", toeflPage: page, toolPage });
}

function render() {
  app.innerHTML = state.app === "main" ? mainShell() : toeflShell();
  bindEvents();
}

function mainShell() {
  return `
    <main class="app-shell">
      <header class="topbar">
        <button class="brand" data-route="main" aria-label="Lumi home">
          <img class="brand-icon" src="assets/Icon-tight.png" alt="" />
          <span>Lumi</span>
        </button>
        <nav class="main-menu" aria-label="Main navigation">
          <button class="nav-link active" data-route="main">Lumi</button>
          <button class="nav-link" data-route="toefl">TOEFL</button>
          <button class="nav-link" data-coming="IELTS">IELTS</button>
          <button class="nav-link" data-coming="GRE">GRE</button>
        </nav>
        <button class="profile-chip" data-coming="Profile">Profile</button>
      </header>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">English test prep with a brighter rhythm</p>
          <div class="hero-title-row">
            <h1>Lumi</h1>
            <img class="hero-lumi" src="assets/lumi-inspired.png" alt="Lumi looking inspired" />
          </div>
          <p>Build a steady study streak, turn practice into momentum, and let every small session move you closer to your target score.</p>
          <button class="primary-btn" data-route="toefl">Start TOEFL Prep</button>
        </div>
      </section>
    </main>
  `;
}

function toeflShell() {
  return `
    <main class="app-shell toefl-page">
      <header class="subbar">
        <button class="back-logo" data-route="main" aria-label="Back to Lumi main page">
          <img class="brand-icon compact" src="assets/Icon-tight.png" alt="" />
          <span>Lumi</span>
        </button>
        <nav class="sub-menu" aria-label="TOEFL navigation">
          <button class="nav-link ${isActive("home")}" data-toefl="home">Home</button>
          <div class="tool-menu">
            <button class="nav-link ${state.toeflPage === "tool" ? "active" : ""}">Prep Tools</button>
            <div class="dropdown">
              <button data-tool="problems">Problems</button>
              <button data-tool="mock">Mock Exam</button>
              <button data-tool="vocab">Vocabulary</button>
              <button data-tool="speaking">Speaking Practice</button>
              <button data-tool="listening">Pocket Listening</button>
            </div>
          </div>
          <button class="nav-link ${isActive("graph")}" data-toefl="graph">Knowledge Graph</button>
          <button class="nav-link ${isActive("forum")}" data-toefl="forum">Community Forum</button>
          <button class="nav-link ${isActive("settings")}" data-toefl="settings">Settings</button>
        </nav>
        <span class="streak-chip">Streak: ${state.checkInCalendar.weeklyStreak} days</span>
      </header>
      <section class="page">
        ${toeflContent()}
      </section>
    </main>
  `;
}

function isActive(page) {
  return state.toeflPage === page ? "active" : "";
}

function toeflContent() {
  if (state.toeflPage === "academicDiscussion") return academicDiscussionPage();
  if (state.toeflPage === "graph") return graphPage();
  if (state.toeflPage === "forum") return blankPage("Community Forum");
  if (state.toeflPage === "settings") return blankPage("Settings");
  if (state.toeflPage === "tool") return toolPage();
  return homePage();
}

function homePage() {
  const hasPlan = state.plan.length > 0;
  const lumiImage = lumiImages[state.mascotMood] || lumiImages.greet;
  const checkIns = state.checkInCalendar;
  return `
    <div class="dashboard-grid">
      <section class="panel coach-panel">
        <div class="lumi-stage">
          <img class="lumi-character ${state.mascotMood}" src="${lumiImage.src}" alt="${lumiImage.alt}" />
        </div>
        <div class="coach-copy">
          <p class="eyebrow">TOEFL Home</p>
          <h2>${hasPlan ? "Your plan is ready." : "How long would you like to study today?"}</h2>
          <p>${hasPlan ? "Lumi shaped a short plan from your goal. You can still add extra practice below." : "Tell Lumi your available time and whether you already have a plan."}</p>
          <form class="plan-form" id="planForm">
            <input id="planInput" value="${escapeHtml(state.userPlanInput)}" placeholder="Example: 90 minutes, no plan yet" />
            <button class="primary-btn" type="submit">Plan</button>
          </form>
          ${hasPlan ? planList() : ""}
          <div class="study-actions">
            ${[
              { skill: "Listening", score: 90 },
              { skill: "Speaking", score: 65 },
              { skill: "Reading", score: 91 },
              { skill: "Writing", score: 86 },
            ].map((item) => `
              <button class="study-action" data-skill="${item.skill}">
                <span class="skill-label">${item.skill}</span>
                <strong>${item.score}%</strong>
              </button>
            `).join("")}
          </div>
        </div>
      </section>
      <aside class="side-stack">
        <section class="panel mini-panel">
          <div class="target-card">
            <p class="eyebrow">Today</p>
            <strong>Target score : 5.5</strong>
          </div>
        </section>
        <section class="panel mini-panel">
          ${checkInCalendar(checkIns)}
        </section>
      </aside>
    </div>
  `;
}

function getPresetCheckInCalendar() {
  return {
    monthLabel: "June 2026",
    weeklyStreak: 7,
    totalSessions: 31,
    days: [
      null, { day: 1, status: "checked" }, { day: 2, status: "checked" }, { day: 3, status: "missed" },
      { day: 4, status: "checked" }, { day: 5, status: "checked" }, { day: 6, status: "rest" },
      { day: 7, status: "checked" }, { day: 8, status: "checked" }, { day: 9, status: "checked" },
      { day: 10, status: "missed" }, { day: 11, status: "checked" }, { day: 12, status: "checked" },
      { day: 13, status: "rest" }, { day: 14, status: "checked" }, { day: 15, status: "checked" },
      { day: 16, status: "checked" }, { day: 17, status: "checked" }, { day: 18, status: "missed" },
      { day: 19, status: "checked" }, { day: 20, status: "rest" }, { day: 21, status: "checked" },
      { day: 22, status: "checked" }, { day: 23, status: "checked" }, { day: 24, status: "checked" },
      { day: 25, status: "checked" }, { day: 26, status: "checked" }, { day: 27, status: "today" },
      { day: 28, status: "upcoming" }, { day: 29, status: "upcoming" }, { day: 30, status: "upcoming" },
      null, null, null, null,
    ],
  };
}

function checkInCalendar(calendar) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `
    <div class="calendar-head">
      <div>
        <p class="eyebrow">Check-in Record</p>
        <h3>${calendar.monthLabel}</h3>
      </div>
      <span class="tag">${calendar.weeklyStreak} day streak</span>
    </div>
    <div class="calendar-grid">
      ${weekdays.map((day) => `<span class="weekday">${day}</span>`).join("")}
      ${calendar.days.map(dayTemplate).join("")}
    </div>
    <div class="calendar-legend">
      <span><i class="legend-dot checked"></i>Checked</span>
      <span><i class="legend-dot today"></i>Today</span>
      <span><i class="legend-dot missed"></i>Missed</span>
    </div>
    <div class="calendar-summary">
      <span>Total Sessions</span>
      <strong>${calendar.totalSessions}</strong>
    </div>
  `;
}

function dayTemplate(day) {
  if (!day) return `<span class="calendar-day empty"></span>`;
  return `<span class="calendar-day ${day.status}" aria-label="Day ${day.day}, ${day.status}">${day.day}</span>`;
}

function planList() {
  return `
    <ul class="plan-list">
      ${state.plan.map((item, index) => {
        const status = state.completedPlanItems[index] ? "complete" : item.status;
        const action = status === "continue" ? "Continue" : status === "complete" ? "Done" : item.action;
        return `
          <li class="plan-item status-${escapeHtml(status)}">
            <button class="plan-task" data-plan-action="${index}" type="button">
              <span class="plan-action">${escapeHtml(action)}</span>
              <span class="plan-title">${escapeHtml(item.title)}</span>
            </button>
            <span class="tag status-tag">${escapeHtml(item.tag)}</span>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function academicDiscussionPage() {
  const isErrorFixing = state.academicStage === "errorFixing";
  return `
    <div class="academic-wrap">
      <section class="academic-main">
        ${academicPromptTemplate()}
        ${isErrorFixing ? academicErrorFixingEditor() : academicDraftEditor()}
      </section>

      ${academicSidePanel()}
    </div>
  `;
}

function academicPromptTemplate() {
  return `
    <article class="academic-prompt">
      <section class="prompt-section">
        <div class="speaker-block">
          <strong>Professor Lee:</strong>
          <p>In this week’s discussion, we are talking about gifts that can support a child’s development. Some gifts may help children become healthier, more creative, or more responsible. What gift would you give to a child to help them develop? Explain your choice with reasons and examples.</p>
        </div>
      </section>

      <section class="prompt-section">
        <div class="response-grid">
          <div class="speaker-block">
            <strong>Anna:</strong>
            <p>I would give a child a soccer ball because it encourages exercise and teamwork. When children play sports with others, they learn how to cooperate, follow rules, and stay healthy.</p>
          </div>
          <div class="speaker-block">
            <strong>Ben:</strong>
            <p>I would give a child a pet. Taking care of an animal can teach responsibility because the child has to feed it, clean it, and pay attention to another living thing.</p>
          </div>
        </div>
      </section>

      <section class="prompt-section">
        <h2>Your Response</h2>
        <p>Write your own contribution to the discussion. You should express your opinion, support it with reasons, and add something new to the discussion.</p>
      </section>
    </article>
  `;
}

function editorToolbarTemplate(showSubmit = false) {
  return `
    <div class="editor-toolbar" aria-label="Draft editing toolbar">
      <div class="editor-tools">
        <button class="editor-btn active" type="button">Cut</button>
        <button class="editor-btn" type="button">Paste</button>
        <button class="editor-btn" type="button">Undo</button>
        <button class="editor-btn" type="button">Redo</button>
      </div>
      ${showSubmit ? `<button class="editor-submit" id="academicSubmit" type="button">Submit</button>` : ""}
    </div>
  `;
}

function academicDraftEditor() {
  return `
    <article class="academic-editor">
      ${editorToolbarTemplate(true)}
      <textarea class="draft-textarea" id="academicDraftInput" aria-label="Your discussion response">${escapeHtml(state.academicDraft)}</textarea>
    </article>
  `;
}

function academicErrorFixingEditor() {
  return `
    <article class="academic-editor">
      ${editorToolbarTemplate(false)}
      <div class="draft-feedback">
        <p>
          I think <span class="draft-highlight red">camera is very useful and meaningful</span>, because it can help <span class="draft-highlight red">child</span> to develop many abilities and make his life more colorful. When a child <span class="draft-highlight red">use camera</span>, he must look around the world carefully. For example, he may see a flower, a dog, or <span class="draft-highlight red">a old man</span> walking in the street. Before he has camera, maybe he <span class="draft-highlight red">never notice</span> these things. Camera can also make children more creative. If a child only study books every day, <span class="draft-highlight blue">he will become boring</span>. But if he has a camera, he can take different pictures, such as sky, food, classmates and his parents. <span class="draft-highlight blue">Maybe he can become a famous photographer in the future.</span> Therefore, camera is the best gift for children’s development.
        </p>
      </div>
    </article>
  `;
}

function academicSidePanel() {
  if (state.academicStage === "draft") {
    return `<aside class="academic-side-empty" aria-hidden="true"></aside>`;
  }
  if (state.academicStage === "loading") {
    return `
      <aside class="academic-guide checking-panel">
        <img class="checking-lumi" src="assets/lumi-checking.png" alt="Lumi checking the response" />
        <h2>Lumi is checking...</h2>
        <div class="checking-progress" aria-label="Checking progress">
          <i style="width:${state.academicProgress}%"></i>
        </div>
        <strong>${state.academicProgress}%</strong>
      </aside>
    `;
  }
  if (state.academicStage === "taskCheck") {
    return `
      <aside class="academic-guide task-panel">
        <h2>Stage 1: Check the Task</h2>
        <p>Before fixing grammar, make sure your response fits the TOEFL Academic Discussion task.</p>
        <div class="task-questions">
          <label><input type="checkbox" /> <span>Did you answer the professor’s question?</span></label>
          <label><input type="checkbox" /> <span>Did you clearly state your own opinion?</span></label>
          <label><input type="checkbox" /> <span>Did you add something new to Anna and Ben’s ideas?</span></label>
          <label><input type="checkbox" /> <span>Did you support your opinion with a reason or example?</span></label>
          <label><input type="checkbox" /> <span>Is your response written as a discussion post, not a long essay?</span></label>
        </div>
        <button class="primary-btn task-action" id="startTaskCheck" type="button">See Lumi Feedbacks</button>
      </aside>
    `;
  }
  if (state.academicStage === "taskResult") {
    return `
      <aside class="academic-guide task-panel">
        <div class="feedback-summary">
          <img class="feedback-lumi" src="assets/lumi-feedback.png" alt="Lumi giving feedback" />
          <div>
            <p><strong>Article score according to ETS rubrics:</strong> <span class="feedback-score">3/5</span></p>
            <p><strong>Reference score:</strong> <span class="feedback-score">3.0/6.0</span></p>
            <p><strong>Main Problems:</strong> Grammar errors, vague examples, weak discussion response</p>
          </div>
        </div>
        <p>Your response answers the professor’s question, but it does not clearly connect your idea to Anna or Ben’s points. Try to show how your choice is different from a soccer ball or a pet.</p>
        <button class="primary-btn task-action" id="continueErrorFixing" type="button">See More Feedbacks</button>
      </aside>
    `;
  }
  return `
    <aside class="academic-guide">
      <h2>How to Use This Page</h2>
      <p>Red highlights show sentence-level problems that may make your writing unclear.</p>
      <p>Blue highlights show places where your ideas can become stronger.</p>
      <p>Click a highlighted part to receive Socratic questions, revise your sentence, and save your improvement.</p>
      <div class="legend-list" aria-label="Highlight color legend">
        <span><i class="legend-swatch red"></i>Red = Fix the error</span>
        <span><i class="legend-swatch blue"></i>Blue = Upgrade the idea</span>
        <span><i class="legend-swatch green"></i>Green = Revised successfully</span>
        <span><i class="legend-swatch yellow"></i>Yellow = Needs another look</span>
      </div>
    </aside>
  `;
}

function graphPage() {
  const isWriting = state.graphSkill === "writing";
  const currentNode = isWriting ? getGraphNodeByPath(state.graphPath) : null;
  const view = isWriting ? buildGraphView(currentNode) : null;
  return `
    <div class="content-wrap">
      ${state.graphSkill ? "" : skillCircleTemplate()}
      ${isWriting ? `
        <section class="panel content-card">
        <div class="graph-toolbar">
          <button class="secondary-btn" id="graphBack">Back</button>
          <div class="graph-trail">${graphTrailTemplate()}</div>
        </div>
        <div class="graph-board">
          <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            ${view.edges.map(edgeTemplate).join("")}
          </svg>
          ${view.nodes.map(nodeTemplate).join("")}
        </div>
        </section>
      ` : graphEmptyState()}
    </div>
  `;
}

function skillCircleTemplate() {
  return `
    <section class="graph-skill-board" aria-label="Knowledge graph skill areas">
      ${skillOptions.map((skill) => `
        <button class="graph-skill-circle ${skill.id}" data-graph-skill="${skill.id}">
          <span>${skill.label}</span>
        </button>
      `).join("")}
    </section>
  `;
}

function graphEmptyState() {
  const selected = skillOptions.find((skill) => skill.id === state.graphSkill);
  const message = selected
    ? `${selected.label} knowledge graph is not available yet.`
    : "";
  if (!message) return "";
  return `
    <section class="panel content-card graph-empty">
      <p>${message}</p>
    </section>
  `;
}

function graphTrailTemplate() {
  const root = writingGraph;
  const labels = [root.label];
  let node = root;
  state.graphPath.forEach((id) => {
    node = (node.children || []).find((child) => child.id === id) || node;
    labels.push(node.label);
  });
  return labels.map((label, index) => `<button data-graph-depth="${index}">${label}</button>`).join("<span>/</span>");
}

function getGraphNodeByPath(path) {
  return path.reduce((node, id) => (node.children || []).find((child) => child.id === id) || node, writingGraph);
}

function buildGraphView(centerNode) {
  const children = centerNode.children || [];
  const center = {
    ...centerNode,
    x: 50,
    y: 50,
    size: getNodeSize(centerNode, "center"),
    fontSize: getNodeFontSize(centerNode, "center"),
    role: "center",
  };
  const sizedChildren = children.map((child) => ({
    ...child,
    size: getNodeSize(child, child.children ? "branch" : "leaf"),
    fontSize: getNodeFontSize(child, child.children ? "branch" : "leaf"),
  }));
  const largestChild = Math.max(...sizedChildren.map((child) => child.size), 0);
  const radius = children.length > 5 ? 36 : largestChild > 138 ? 36 : 34;
  const margin = children.length > 5 ? 12 : 11;
  const childNodes = children.map((child, index) => {
    const angle = -90 + (360 / Math.max(children.length, 1)) * index;
    const radians = (angle * Math.PI) / 180;
    const sizedChild = sizedChildren[index];
    return {
      ...sizedChild,
      x: clamp(50 + Math.cos(radians) * radius, margin, 100 - margin),
      y: clamp(50 + Math.sin(radians) * radius, margin, 100 - margin),
      role: child.children ? "branch" : "leaf",
    };
  });
  return {
    nodes: [center, ...childNodes],
    edges: childNodes.map((node) => ({ x1: 50, y1: 50, x2: node.x, y2: node.y })),
  };
}

function nodeTemplate(node) {
  const color = masteryColor(node.mastery);
  const clickable = node.role !== "center" && node.children;
  return `
    <button class="node ${node.role}" data-level="${node.mastery}%" ${clickable ? `data-graph-node="${node.id}"` : ""}
      style="left:${node.x}%; top:${node.y}%; --size:${node.size}px; --node-font:${node.fontSize}rem; --node-color:${color}; transform: translate(-50%, -50%);">
      ${formatNodeLabel(node.label)}
    </button>
  `;
}

const graphLabelBreaks = {
  "Write for an Academic Discussion": "Write for an|Academic Discussion",
  "Legacy Material Bank": "Legacy Material|Bank",
  "Core Competencies": "Core|Competencies",
  "Build a Sentence": "Build a|Sentence",
  "Write an Email": "Write an|Email",
  "Model Response Analysis": "Model Response|Analysis",
  "Academic Collocations": "Academic|Collocations",
  "Lexical Replacements": "Lexical|Replacements",
  "Rhetorical Functions": "Rhetorical|Functions",
  "Response to Peers": "Response|to Peers",
  "Support / Example": "Support /|Example",
  "Sentence Boundaries": "Sentence|Boundaries",
  "Question Formation": "Question|Formation",
  "Agreement / Tense": "Agreement /|Tense",
  "Discourse Structure": "Discourse|Structure",
  "Language Quality": "Language|Quality",
  "Task Fulfillment": "Task|Fulfillment",
};

function getLabelParts(label) {
  return (graphLabelBreaks[label] || label).split("|");
}

function getNodeSize(node, role) {
  const parts = getLabelParts(node.label);
  const longestLine = Math.max(...parts.map((part) => part.length));
  const totalLetters = parts.join("").length;
  const lineBonus = Math.max(parts.length - 1, 0) * 8;
  if (role === "center") {
    const base = state.graphPath.length ? 124 : 132;
    return clamp(Math.round(base + longestLine * 1.2 + lineBonus), base, 152);
  }
  const base = role === "branch" ? 106 : 92;
  const max = role === "branch" ? 148 : 132;
  return clamp(Math.round(base + longestLine * 2.1 + Math.max(totalLetters - 12, 0) * 0.7 + lineBonus), base, max);
}

function getNodeFontSize(node, role) {
  const parts = getLabelParts(node.label);
  const longestLine = Math.max(...parts.map((part) => part.length));
  const base = role === "center" ? 1.05 : role === "branch" ? 0.9 : 0.82;
  const reduction = Math.max(longestLine - 12, 0) * 0.012;
  return clamp(Number((base - reduction).toFixed(2)), role === "center" ? 0.98 : 0.74, base);
}

function formatNodeLabel(label) {
  return getLabelParts(label)
    .map((part) => escapeHtml(part))
    .map((part) => `<span>${part}</span>`)
    .join("");
}

function edgeTemplate(edge) {
  return `<line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" />`;
}

function masteryColor(level) {
  if (level > 84) return "#104b3c";
  if (level > 68) return "#18745d";
  if (level > 52) return "#2e9b78";
  if (level > 40) return "#69b98f";
  return "#b6d8a2";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function blankPage(title) {
  return `
    <div class="content-wrap">
      <p class="eyebrow">TOEFL</p>
      <h1 class="page-title">${title}</h1>
      <section class="blank-panel"></section>
    </div>
  `;
}

function toolPage() {
  const page = state.toolPage || "problems";
  const titles = {
    problems: "Problems",
    mock: "Mock Exam",
    vocab: "Vocabulary",
    speaking: "Speaking Practice",
    listening: "Pocket Listening",
  };
  if (page === "mock") {
    return blankTool(titles[page]);
  }
  return `
    <div class="content-wrap">
      <p class="eyebrow">Prep Tools</p>
      <h1 class="page-title">${titles[page]}</h1>
      ${toolContent(page)}
    </div>
  `;
}

function blankTool(title) {
  return `
    <div class="content-wrap">
      <p class="eyebrow">Prep Tools</p>
      <h1 class="page-title">${title}</h1>
      <section class="blank-panel"></section>
    </div>
  `;
}

function toolContent(page) {
  if (page === "problems") return problemsPage();
  if (page === "vocab") return vocabPage();
  if (page === "speaking") return speakingPage();
  if (page === "listening") return listeningPage();
  return "";
}

function problemsPage() {
  return `
    <section class="panel content-card">
      <div class="list-stack">
        ${problems.map((item, index) => `<div class="problem-row"><span>${item}</span><span class="tag">Set ${index + 1}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function vocabPage() {
  if (state.selectedVocabDeckIndex === null) return vocabDeckListPage();
  return vocabPracticePage();
}

function vocabDeckListPage() {
  return `
    <section class="panel content-card vocab-library">
      <div class="vocab-controls">
        <button class="primary-btn">New Deck</button>
        <button class="secondary-btn">Import Deck</button>
      </div>
      <div class="list-stack">
        ${vocabDecks.map((deck, index) => vocabDeckRow(deck, index)).join("")}
      </div>
    </section>
  `;
}

function vocabDeckRow(deck, index) {
  const percent = Math.round((deck.learned / deck.count) * 100);
  return `
    <button class="word-row vocab-deck-row" data-vocab-deck="${index}">
      <div class="deck-main">
        <span>${escapeHtml(deck.name)}</span>
        <div class="deck-progress" aria-label="${percent}% learned">
          <i style="width:${percent}%"></i>
        </div>
      </div>
      <div class="deck-stats">
        <span class="tag">${deck.learned}/${deck.count}</span>
        <span>${deck.mastered} mastered</span>
        <span>${deck.due} due</span>
      </div>
    </button>
  `;
}

function vocabPracticePage() {
  const current = studyWords[state.currentWordIndex % studyWords.length];
  const deck = vocabDecks[state.selectedVocabDeckIndex] || vocabDecks[0];
  return `
    <section class="panel content-card vocab-practice">
      <div class="vocab-practice-head">
        <button class="secondary-btn" id="backToDecks">Back</button>
        <div>
          <p class="eyebrow">Vocabulary Practice</p>
          <h2>${escapeHtml(deck.name)}</h2>
        </div>
        <span class="tag">${deck.learned}/${deck.count}</span>
      </div>
      <div class="vocab-practice-grid">
        <aside class="study-word">
          <strong>${current.word}</strong>
          <span>${current.meaning}</span>
          <div class="word-scene" style="background-position:${current.imagePosition};" aria-label="Illustration for ${escapeHtml(current.word)}"></div>
          <button class="primary-btn" id="nextWord">Next Word</button>
        </aside>
        <div class="sentence-coach">
          <div class="chat-box sentence-chat" id="vocabSentenceChat">
            ${state.vocabSentenceMessages.map((message) => `<div class="bubble ${message.role}">${escapeHtml(message.text).replaceAll("\n", "<br>")}</div>`).join("")}
          </div>
          <form class="sentence-form" id="vocabSentenceForm">
            <textarea id="vocabSentenceInput" rows="5" placeholder="Write one sentence with ${escapeHtml(current.word)}">${escapeHtml(state.vocabSentenceDraft)}</textarea>
            <button class="primary-btn" type="submit">Check</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function speakingPage() {
  return `
    <div class="tool-grid">
      <section class="panel content-card">
        <p class="eyebrow">Live Practice</p>
        <h2>Practice with Lumi</h2>
        <div class="chat-box" id="speakingChat">
          <div class="bubble lumi">Tell me about a place where you study well. Give one reason and one example.</div>
        </div>
        <form class="plan-form" id="speakingForm">
          <input id="speakingInput" placeholder="Type your spoken answer draft" />
          <button class="primary-btn" type="submit">Send</button>
        </form>
      </section>
      <aside class="panel content-card">
        <p class="eyebrow">Focus</p>
        <p>Fluency, structure, examples, pronunciation notes.</p>
      </aside>
    </div>
  `;
}

function listeningPage() {
  return `
    <section class="panel content-card">
      <div class="list-stack">
        ${tracks.map((track) => `
          <div class="track-row">
            <div class="audio-row">
              <span class="play-dot"></span>
              <span>${track.title}</span>
              <span class="tag">${track.length}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-route='main']").forEach((el) => {
    el.addEventListener("click", goMain);
  });
  document.querySelectorAll("[data-route='toefl']").forEach((el) => {
    el.addEventListener("click", () => goToefl("home"));
  });
  document.querySelectorAll("[data-toefl]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.toefl === "graph") {
        setState({ app: "toefl", toeflPage: "graph", toolPage: null, graphSkill: "", graphPath: [] });
        return;
      }
      goToefl(el.dataset.toefl);
    });
  });
  document.querySelectorAll("[data-tool]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.tool === "vocab") {
        setState({
          app: "toefl",
          toeflPage: "tool",
          toolPage: "vocab",
          selectedVocabDeckIndex: null,
          vocabSentenceDraft: "",
          vocabSentenceMessages: [],
        });
        return;
      }
      goToefl("tool", el.dataset.tool);
    });
  });
  document.querySelectorAll("[data-skill]").forEach((el) => {
    el.addEventListener("click", () => {
      const skill = el.dataset.skill.toLowerCase();
      setState({ app: "toefl", toeflPage: "graph", toolPage: null, graphSkill: skill, graphPath: [] });
    });
  });
  document.querySelectorAll("[data-coming]").forEach((el) => {
    el.addEventListener("click", () => {
      el.textContent = `${el.dataset.coming} Soon`;
      window.setTimeout(render, 900);
    });
  });
  document.querySelectorAll("[data-graph-node]").forEach((el) => {
    el.addEventListener("click", () => {
      transitionGraphUpdate(() => {
        setState({ graphPath: [...state.graphPath, el.dataset.graphNode] });
      }, el);
    });
  });
  document.querySelectorAll("[data-graph-depth]").forEach((el) => {
    el.addEventListener("click", () => {
      const depth = Number(el.dataset.graphDepth);
      setState({ graphPath: state.graphPath.slice(0, Math.max(0, depth)) });
    });
  });
  document.querySelectorAll("[data-graph-skill]").forEach((el) => {
    el.addEventListener("click", () => {
      setState({ graphSkill: el.dataset.graphSkill, graphPath: [] });
    });
  });

  const graphBack = document.querySelector("#graphBack");
  if (graphBack) {
    graphBack.addEventListener("click", () => {
      if (!state.graphPath.length) {
        setState({ graphSkill: "", graphPath: [] });
        return;
      }
      transitionGraphUpdate(() => {
        setState({ graphPath: state.graphPath.slice(0, -1) });
      });
    });
  }

  const planForm = document.querySelector("#planForm");
  if (planForm) {
    planForm.addEventListener("submit", handlePlanSubmit);
  }

  const nextWord = document.querySelector("#nextWord");
  if (nextWord) {
    nextWord.addEventListener("click", () => setState({
      currentWordIndex: state.currentWordIndex + 1,
      vocabSentenceDraft: "",
      vocabSentenceMessages: [],
    }));
  }

  document.querySelectorAll("[data-vocab-deck]").forEach((el) => {
    el.addEventListener("click", () => {
      setState({
        selectedVocabDeckIndex: Number(el.dataset.vocabDeck),
        currentWordIndex: 0,
        vocabSentenceDraft: "",
        vocabSentenceMessages: [],
      });
    });
  });

  const backToDecks = document.querySelector("#backToDecks");
  if (backToDecks) {
    backToDecks.addEventListener("click", () => {
      setState({
        selectedVocabDeckIndex: null,
        vocabSentenceDraft: "",
        vocabSentenceMessages: [],
      });
    });
  }

  const speakingForm = document.querySelector("#speakingForm");
  if (speakingForm) {
    speakingForm.addEventListener("submit", handleSpeakingSubmit);
  }

  document.querySelectorAll("[data-plan-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const item = state.plan[Number(el.dataset.planAction)];
      if (!item) return;
      if (item.route === "speaking") {
        goToefl("tool", "speaking");
        return;
      }
      if (item.route === "vocab") {
        setState({
          app: "toefl",
          toeflPage: "tool",
          toolPage: "vocab",
          selectedVocabDeckIndex: null,
          vocabSentenceDraft: "",
          vocabSentenceMessages: [],
        });
        return;
      }
      if (item.route === "academic-discussion") {
        clearAcademicProgressTimer();
        setState({
          app: "toefl",
          toeflPage: "academicDiscussion",
          toolPage: null,
          academicStage: "draft",
          academicProgress: 0,
          academicDraft: getDefaultAcademicDraft(),
        });
      }
    });
  });

  const academicSubmit = document.querySelector("#academicSubmit");
  if (academicSubmit) {
    academicSubmit.addEventListener("click", handleAcademicSubmit);
  }

  const startTaskCheck = document.querySelector("#startTaskCheck");
  if (startTaskCheck) {
    startTaskCheck.addEventListener("click", () => setState({ academicStage: "taskResult" }));
  }

  const continueErrorFixing = document.querySelector("#continueErrorFixing");
  if (continueErrorFixing) {
    continueErrorFixing.addEventListener("click", () => setState({ academicStage: "errorFixing" }));
  }

  const vocabSentenceForm = document.querySelector("#vocabSentenceForm");
  if (vocabSentenceForm) {
    vocabSentenceForm.addEventListener("submit", handleVocabSentenceSubmit);
  }
}

async function handlePlanSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("#planInput").value.trim();
  setState({ mascotMood: "thinking", userPlanInput: input });
  const plan = await mockApi.buildDailyPlan(input);
  setState({ mascotMood: "smile", plan, completedPlanItems: {} });
}

function clearAcademicProgressTimer() {
  if (academicProgressTimer) {
    window.clearInterval(academicProgressTimer);
    academicProgressTimer = null;
  }
}

function handleAcademicSubmit() {
  const draftInput = document.querySelector("#academicDraftInput");
  const draft = draftInput ? draftInput.value.trim() : state.academicDraft;
  clearAcademicProgressTimer();
  setState({
    academicStage: "loading",
    academicProgress: 0,
    academicDraft: draft || getDefaultAcademicDraft(),
  });
  academicProgressTimer = window.setInterval(() => {
    const nextProgress = Math.min(state.academicProgress + 10, 100);
    if (nextProgress >= 100) {
      clearAcademicProgressTimer();
      setState({ academicProgress: 100, academicStage: "taskCheck" });
      return;
    }
    setState({ academicProgress: nextProgress });
  }, 1000);
}

function transitionGraphUpdate(update, selectedEl) {
  const board = document.querySelector(".graph-board");
  if (!board) {
    update();
    return;
  }
  if (selectedEl) selectedEl.classList.add("selected");
  board.classList.add("focus-out");
  window.setTimeout(update, 260);
}

async function handleSpeakingSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("#speakingInput");
  const message = input.value.trim();
  if (!message) return;
  const chat = document.querySelector("#speakingChat");
  chat.insertAdjacentHTML("beforeend", `<div class="bubble user">${escapeHtml(message)}</div>`);
  input.value = "";
  const reply = await mockApi.lumiReply(message);
  chat.insertAdjacentHTML("beforeend", `<div class="bubble lumi">${escapeHtml(reply)}</div>`);
}

async function handleVocabSentenceSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("#vocabSentenceInput");
  const sentence = input.value.trim();
  if (!sentence) return;
  const current = studyWords[state.currentWordIndex % studyWords.length];
  const messages = [...state.vocabSentenceMessages, { role: "user", text: sentence }];
  setState({ vocabSentenceDraft: "", vocabSentenceMessages: messages });
  const reply = await mockApi.reviewVocabularySentence(current.word, current.meaning, sentence);
  setState({ vocabSentenceMessages: [...messages, { role: "lumi", text: reply }] });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
