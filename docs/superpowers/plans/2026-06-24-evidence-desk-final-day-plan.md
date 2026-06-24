# CoverPilot Final-Day Evidence Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CoverPilot as a credible one-stop AI insurance evidence desk for Singapore by Wednesday night, with a demo-ready live app, submission assets, and a legally safe pitch by Thursday 12:00 p.m. SGT.

**Architecture:** Keep the current one-page workspace as the demo surface. The product story is one shared evidence record powering Ask, Decode, Verify, Review, Prepare, and History, with Verify + Evidence Report as the deep wedge. The app must remain usable with seeded evidence even if the OpenAI API fails.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, OpenAI API optional, static seeded evidence in `src/data/demo-evidence.ts`, existing compare API in `src/app/api/statements/compare/route.ts`.

## Global Constraints

- The demo must center on the evidence desk, not a generic chatbot.
- The app must never give personalized financial advice, product recommendations, buy/sell/keep/switch instructions, suitability verdicts, or rankings.
- "Review" should produce discussion prompts and context questions only.
- "Prepare" should help users ask a licensed FA better questions, not replace the FA.
- The app must work live even if `OPENAI_API_KEY` is missing or rate-limited.
- Ayman should sign off all insurance wording and compliance-sensitive claims.
- No new packages unless absolutely necessary.
- Before demo recording, run `npm run lint` and `OPENAI_API_KEY=dummy npm run build`.

---

## Today Ownership

| Owner | Primary Lane | Outcome |
| --- | --- | --- |
| Bryan | Engineering reliability, API behavior, deployment, architecture notes | Live demo link works and can survive failures |
| Janine | Product narrative, demo script, Devpost copy, pitch/deck assets, UI wording | Judges understand why this is a startup, not a wrapper |
| Ayman | FA domain review and compliance sign-off | Demo claims sound credible and legally safe |

---

## Timeline For Wednesday 2026-06-24

### Block 1: Stabilize The Product Surface

Target: first 90 minutes.

Bryan:

- [ ] Pull latest main: `git pull origin main`.
- [ ] Run `npm run lint`.
- [ ] Run `OPENAI_API_KEY=dummy npm run build`.
- [ ] Confirm the app still renders locally with `npm run dev`.
- [ ] Check the live deployment environment has `OPENAI_API_KEY` configured.
- [ ] Confirm the app still works if OpenAI fails by testing the seeded evidence fallback.
- [ ] Fix the compare endpoint or UI if the fallback path is mislabeled as a live AI pass.

Janine:

- [ ] Open the homepage and walk through the demo flow once from a judge's perspective.
- [ ] Mark any copy that sounds like advice, recommendation, ranking, or suitability.
- [ ] Tighten the hero and section labels around "evidence desk," "verification," "official-source grounding," and "licensed adviser discussion."
- [ ] Draft the 3-minute demo flow around one concrete claim from an FA conversation.
- [ ] Send Ayman the exact demo claims and ask for domain/compliance review.

Ayman:

- [ ] Review the seeded claims, evidence summaries, and discussion questions.
- [ ] Flag anything that sounds like regulated financial advice.
- [ ] Confirm whether the cost/value examples are realistic enough for demo use.

### Block 2: Make The Demo Feel Bigger Than ClearFA

Target: next 2 to 3 hours.

Bryan:

- [ ] Make sure the demo has a clear "shared evidence record" technical story.
- [ ] Verify that Ask, Decode, Verify, Review, Prepare, and History all feel connected to the same case.
- [ ] Add minimal reliability polish only if it directly supports the demo: loading state, error state, fallback label, or source label.
- [ ] Capture a short technical architecture note for Devpost: frontend, evidence data, compare endpoint, OpenAI fallback path, deployment.
- [ ] Push changes to `main` after lint/build pass.

Janine:

- [ ] Write the Devpost problem statement and target user.
- [ ] Write the 2-3 sentence solution summary.
- [ ] Prepare the tools-used list: OpenAI, Next.js, React, TypeScript, Tailwind, deployment platform, GitHub.
- [ ] Prepare the pitch deck outline, max 10 slides.
- [ ] Prepare screenshot checklist: hero, shared evidence record, Verify, Review, Prepare, decision firewall.

Ayman:

- [ ] Review Janine's Devpost copy for compliance wording.
- [ ] Suggest one real FA-client scenario that can be used in the demo without exposing private client details.

### Block 3: Submission Assets

Target: afternoon to evening.

Bryan:

- [ ] Deploy the latest working version.
- [ ] Share the live link with Janine and Ayman.
- [ ] Confirm no browser console errors on the deployed app.
- [ ] Provide final GitHub repo URL and technical architecture bullets.
- [ ] Stay on standby for recording bugs.

Janine:

- [ ] Record one full dry run under 3 minutes.
- [ ] Cut the demo script down until the product is understandable in the first 30 seconds.
- [ ] Finalize Devpost fields:
  - [ ] Project name and team members.
  - [ ] Problem statement and target user.
  - [ ] 2-3 sentence solution summary.
  - [ ] Demo video YouTube link.
  - [ ] Live demo/prototype link/screenshots.
  - [ ] Pitch deck link.
  - [ ] Tools used.
  - [ ] Optional GitHub repo, architecture, user/domain feedback.
- [ ] Build the pitch deck with Ayman's FA angle and Bryan's technical architecture.

Ayman:

- [ ] Validate final demo script for domain accuracy.
- [ ] Validate pitch slide wording for legal safety.
- [ ] Provide one sentence of user validation or FA-side insight if available.

### Block 4: Final Rehearsal

Target: Wednesday night.

All:

- [ ] Run the live app from a clean browser session.
- [ ] Rehearse the demo once with Bryan watching for technical issues.
- [ ] Rehearse the pitch once with Ayman watching for FA/compliance issues.
- [ ] Freeze scope after the rehearsal unless something breaks the demo.
- [ ] Keep a fallback recording plan ready if live demo becomes unstable.

---

## Bryan's P0 Task List

1. Deployment and environment
   - [ ] Pull latest `main`.
   - [ ] Run lint/build.
   - [ ] Confirm deployed app uses the latest commit.
   - [ ] Confirm `OPENAI_API_KEY` is present where deployed.

2. Compare endpoint reliability
   - [ ] Check `src/app/api/statements/compare/route.ts`.
   - [ ] Ensure OpenAI failure returns seeded evidence without crashing.
   - [ ] Ensure the UI can honestly distinguish live AI output from demo fallback output.

3. Demo stability
   - [ ] Verify homepage.
   - [ ] Verify "Run evidence review."
   - [ ] Verify all main sections display on desktop and mobile widths.
   - [ ] Provide final live demo link.

4. Devpost technical content
   - [ ] Write 5-7 bullets explaining architecture.
   - [ ] List tools used.
   - [ ] Provide GitHub repo link.

## Janine's P0 Task List

1. Product narrative
   - [ ] Position CoverPilot as "Singapore's AI insurance evidence desk."
   - [ ] Make the one-stop ambition clear.
   - [ ] Make the wedge clear: FA claim verification and evidence report.
   - [ ] Explain that this is broader than ClearFA because it supports the whole insurance conversation, not only policy illustration analysis.

2. Demo script
   - [ ] Start with a concrete FA claim.
   - [ ] Show Ask for official-source context.
   - [ ] Show Decode for policy facts.
   - [ ] Show Verify as the main moment.
   - [ ] Show Review/Prepare as the compliance-safe next step.
   - [ ] End with the startup ambition and why AI changes the labor structure.

3. Submission collateral
   - [ ] Devpost problem statement.
   - [ ] Devpost target user.
   - [ ] Solution summary.
   - [ ] Pitch deck outline.
   - [ ] Demo video script.
   - [ ] Screenshots.

4. Legal/compliance language
   - [ ] Replace "advice" with "evidence," "verification," "questions," or "preparation" where needed.
   - [ ] Avoid "best policy," "should buy," "should switch," "recommended," and "suitable."
   - [ ] Include the decision firewall in the demo.

## Ayman's Review Lane

Ayman does not need to own a heavy build lane today unless he has spare time. His highest leverage is domain review.

- [ ] Review the product thesis against FA reality.
- [ ] Check that demo claims are plausible.
- [ ] Check that discussion questions are useful to an FA-client conversation.
- [ ] Flag regulated-advice wording.
- [ ] Give one validation quote or FA-side insight for pitch/deck.

---

## Demo Flow

Use this sequence for the 3-minute video:

1. "A consumer hears a claim from an FA and does not know whether it is grounded in their documents or official rules."
2. Show CoverPilot's shared evidence record.
3. Ask: get official-source context.
4. Decode: extract relevant policy facts.
5. Verify: compare the FA claim against evidence and show what is supported, missing, or needs clarification.
6. Review: generate context questions without making a recommendation.
7. Prepare: turn the evidence into questions for a licensed adviser.
8. Close: "We are building the evidence layer for insurance conversations in Singapore."

---

## Definition Of Done

- [ ] Live demo link works.
- [ ] Demo can be completed in under 3 minutes.
- [ ] Verify + Evidence Report is the strongest visible feature.
- [ ] App does not look like only ClearFA or only a chatbot.
- [ ] No personalized financial advice is produced.
- [ ] Ayman has reviewed the demo wording.
- [ ] Bryan has confirmed deployment and build.
- [ ] Janine has Devpost copy, screenshots, and pitch deck outline ready.

---

## Self-Review

This plan deliberately avoids adding broad new product modules today. The one-stop ambition is preserved through the visible workspace, but the judged demo remains focused on one deep workflow: turning messy insurance conversations into an evidence-backed report and adviser discussion plan. That keeps the product startup-sized without becoming a shallow menu of unfinished tools.
