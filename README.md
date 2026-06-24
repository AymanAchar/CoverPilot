# CoverPilot

Singapore's AI insurance evidence desk. Helps users understand policy documents, compare sales statements against source text, and prepare questions for licensed advisers — without recommending what to buy, keep, cancel, or switch.

## Getting Started

```bash
cp .env.example .env.local
# add your OPENAI_API_KEY to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Core Routes

| Route | Purpose |
|---|---|
| `/` | Home — Decode / Check / Prepare modules |
| `/decode` | Extract structured facts from a policy document |
| `/check` | Compare statements against source text |
| `/prepare` | Generate meeting-prep report and adviser questions |

## API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/policy/extract` | Returns policy facts (seeded or PDF) |
| `POST /api/statements/compare` | AI-powered statement vs document comparison + calculations |
| `POST /api/report/generate` | Generates full meeting-prep report |

## Compliance

CoverPilot does not recommend what to buy, keep, cancel, or switch. The Decision Firewall blocks any prompt requesting financial advice.

## Deployment

The shared GitHub repo can be deployed on Vercel or Render.

### Recommended: Vercel

1. Import `AymanAchar/CoverPilot` into Vercel.
2. Framework preset: `Next.js`.
3. Build command: `npm run build`.
4. Install command: `npm install`.
5. Add environment variable:

```bash
OPENAI_API_KEY=<hackathon OpenAI API key>
```

Vercel will redeploy automatically whenever `main` is pushed.

### Alternative: Render

The repo includes `render.yaml`.

Render settings:

```bash
Build Command: npm install && npm run build
Start Command: npm run start
Environment: OPENAI_API_KEY=<hackathon OpenAI API key>
```

The homepage evidence review has a deterministic demo fallback, but the full AI-backed API routes should be deployed with `OPENAI_API_KEY` set.
