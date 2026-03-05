# AI Sales Systems Benchmark — Project Context

## Project Name
AI Sales Systems Benchmark

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

---

## Objective

The AI Sales System Benchmark application is a **Lead Magnet** that generates high-intent booked calls for the **BYST Sales Systems** offer by helping sales leaders understand:

- Where their sales organization stands in AI adoption
- What AI-native sales organizations are doing differently
- What revenue they are losing by not implementing AI sales systems

The lead magnet should create a clear realization:

> "If we don't adopt AI systems, we will fall behind and we will not reach our revenue targets. Fixing this internally would take months and we don't have the bandwidth. We should talk to someone who has done this before."

---

## One Sentence Promise

In 5 minutes, benchmark your sales organization's AI adoption across AE productivity, sales leadership visibility, and enablement systems — and estimate the revenue opportunity you are leaving on the table.

---

## Target Audience

- **Role:** Founders or Sales Leaders
- **Industry:** B2B SaaS / AI companies
- **ARR:** €1M–€50M
- **Sales team size:** 3–20 AEs
- **No** dedicated RevOps or Sales Enablement team
- Feeling pressure around AI adoption

### Typical Mindset
- "Everyone is talking about AI but I don't know where to start."
- "My reps are experimenting with tools but we have no system."
- "I feel like competitors might be moving faster than us."
- "I need the right systems so that my sales team can grow and perform."

---

## Buyer Trigger

**Fear of falling behind operationally due to AI.**

Signals the buyer feels:
- AI could dramatically increase AE productivity
- Competitors may already be using it
- Their sales stack is still systems of record, not systems of action
- They don't know what "good" looks like

---

## Key Insight

Most companies experimenting with AI are doing **random tool adoption**.

The real competitive advantage comes from implementing **AI sales systems** across three layers:

1. AI systems for AEs
2. AI systems for Sales Leaders
3. AI-enabled enablement assets

The benchmark scores companies across these three pillars.

---

## Format

Interactive diagnostic assessment — AI agent / AI funnel.

---

## Application Flow

### Stage 1 — AI Company Analysis (Domain Input)

User enters their **company domain**.

#### 1.1 AI Engine Data Collection
From the domain, the AI tool attempts to automatically extract company information.
- Logic defined in: `lib/data-enrichment-logic.ts`

#### 1.2 Confirmation Step
Before moving forward, the tool shows the extracted assumptions to the user.

The user can:
- Confirm the data is correct
- Correct the data and/or add additional information
- Answer missing information

This step:
1. Improves benchmark accuracy
2. Qualifies the lead

---

### Stage 2 — Benchmark Assessment

The tool evaluates the company across three AI Sales Systems pillars.

#### Pillar 1 — AI Systems for AEs
**Goal:** Measure how the company is using AI to increase rep productivity and selling time.
- Data needed: `lib/data-needed-ae.ts`

#### Pillar 2 — AI Systems for Sales Leaders
**Goal:** Measure how the company is using AI to improve decision-making, coaching, and pipeline visibility.
- Data needed: `lib/data-needed-leadership.ts`

#### Pillar 3 — AI Sales Enablement Systems
**Goal:** Measure how the company is using AI to coach and train talent so there's a consistent way of turning average talent into consistent top performers.
- Data needed: `lib/data-needed-enablement.ts`

Questions and logic: `lib/questions-flow.ts`

---

### Stage 3 — Benchmark Output

After completion, the tool generates a **personalized report**.

Output is delivered in **4 phases**:
1. AE Systems results
2. Leadership Systems results
3. Enablement Systems results
4. Overall cost of opportunity + emotional triggers

- Output logic: `lib/output-logic.ts`

---

### Stage 4 — CTA & Pitch

After showcasing the 4 output phases, the application presents a call to action and a BYST pitch.

- CTA and pitch logic: `lib/cta-pitch.ts`

---

## Lib Folder Reference

| File | Purpose |
|------|---------|
| `lib/data-enrichment-logic.ts` | Logic for auto-extracting company data from domain |
| `lib/questions-flow.ts` | Question flow and branching logic for the benchmark |
| `lib/data-needed-ae.ts` | Data points and questions for Pillar 1 (AE Systems) |
| `lib/data-needed-leadership.ts` | Data points and questions for Pillar 2 (Leadership Systems) |
| `lib/data-needed-enablement.ts` | Data points and questions for Pillar 3 (Enablement Systems) |
| `lib/output-logic.ts` | Scoring and personalized report generation logic |
| `lib/cta-pitch.ts` | CTA copy and BYST pitch logic |
