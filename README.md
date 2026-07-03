# Lumi

Lumi is a TOEFL prep prototype with AI-assisted daily planning, writing revision, vocabulary coaching, speaking practice, listening review, and a lightweight knowledge graph view.

## Setup

From the Lumi repo root, install the web app dependencies:

```bash
cd web
npm install
```

Pull the SAGE repo next to the Lumi web app. `SAGE/` is ignored by this repo, so each machine needs a local checkout.

First-time setup, from the Lumi repo root:

```bash
git clone https://github.com/siyuan0000/SAGE.git SAGE
```

If `SAGE/` already exists, update it instead from the Lumi repo root:

```bash
git -C SAGE pull --ff-only
```

Initialize SAGE's optional benchmark submodule if you need SocraticBench evaluation:

```bash
git -C SAGE submodule update --init --recursive
```

## Run

```bash
cd web
npm start
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use:

```bash
PORT=3100 npm start
```

## Configuration

Create `.env` in the project root:

```bash
DEEPSEEK_API_KEY=your_key_here
# Optional, only needed when port 3000 is occupied:
# PORT=3100
```

The Lumi web server reads `.env` from the project root. `DEEPSEEK_API_KEY` enables AI daily planning, speaking feedback, and SAGE-style vocabulary coaching. Without the key, local fallback responses are used where available.

The integrated web app currently uses the SAGE architecture inside `web/server.js`. The local `SAGE/` checkout is for keeping the reference SAGE implementation, profiles, KG examples, and evaluation tools available beside Lumi.

For standalone SAGE runs, either export the same variables in your shell or copy `.env` into `SAGE/.env` before running `python -m sage ...`. Useful SAGE variables:

```bash
DEEPSEEK_API_KEY=your_key_here
SAGE_MAX_TOKENS=800

# Optional OpenAI-compatible endpoint override:
SAGE_LLM_API_BASE=https://api.deepseek.com/v1
SAGE_LLM_API_KEY=your_key_here
SAGE_MODEL=deepseek-chat

# Optional role-specific model overrides:
SAGE_GUIDANCE_MODEL=deepseek-chat
SAGE_EXECUTION_MODEL=deepseek-chat
SAGE_SCORING_MODEL=deepseek-chat
```

Quick SAGE smoke test:

```bash
cd SAGE
python -m sage demo
```

## Features

- AI daily plan on the TOEFL home page
- Clickable plan todos that jump to the matching tool
- Academic Discussion writing flow with guided revision
- Vocabulary sentence coaching and scoring
- Speaking practice feedback
- Listening and reading practice entry points

## Structure

```text
web/
  index.html
  app.js
  styles.css
  server.js
  package.json
```
