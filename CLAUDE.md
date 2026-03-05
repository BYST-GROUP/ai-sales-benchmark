# AI Sales Systems Benchmark — Project Context

## Project Name
AI Sales Systems Benchmark

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS v4 (CSS-first config via `@theme` in `globals.css` + `tailwind.config.ts`)

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

---

## Design System — BYST Brand Guidelines

### Fonts

| Role | Family | Weights | CSS Variable |
|------|--------|---------|-------------|
| Body / UI | Inter | 300, 400, 500, 600, 700 | `--font-inter` / `font-sans` |
| Display / Headings | Space Grotesk | 400, 500, 600, 700 | `--font-space-grotesk` / `font-display` |

- Both fonts imported via `next/font/google` in `app/layout.tsx`
- `h1`–`h6` use `font-display` (Space Grotesk) via base CSS in `globals.css`
- Body defaults to `font-sans` (Inter)

---

### Color Palette

| Token | HSL | Hex | Tailwind class |
|-------|-----|-----|----------------|
| `--background` | `0 0% 0%` | `#000000` | `bg-background` |
| `--foreground` | `0 0% 100%` | `#ffffff` | `text-foreground` |
| `--card` | `0 0% 4%` | `#0a0a0a` | `bg-card` |
| `--primary` | `173 100% 31%` | `#009e8f` | `bg-primary` / `text-primary` |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | `text-primary-foreground` |
| `--secondary` | `0 0% 8%` | `#141414` | `bg-secondary` |
| `--secondary-foreground` | `0 0% 70%` | `#b3b3b3` | `text-secondary-foreground` |
| `--muted` | `0 0% 10%` | `#1a1a1a` | `bg-muted` |
| `--muted-foreground` | `0 0% 55%` | `#8c8c8c` | `text-muted-foreground` |
| `--border` | `0 0% 14%` | `#242424` | `border-border` |
| `--accent` | `173 100% 31%` | `#009e8f` | `bg-accent` / `text-accent` |
| `--radius` | — | `0.25rem` | `rounded` |

---

### UI Patterns

#### Buttons
```tsx
// Outlined
<button className="rounded-full text-sm font-medium px-7 py-3.5 border border-primary text-primary bg-background hover:bg-primary/10 transition-colors">
  Label
</button>

// Filled
<button className="rounded-full text-sm font-medium px-7 py-3.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors">
  Label
</button>
```

#### Cards
```tsx
<div className="border border-border rounded p-6 md:p-8">
  {/* content */}
</div>
```

#### Accent Line (under section headings)
```tsx
<div className="accent-line" />
// 2px × 3rem teal bar — defined as @utility in globals.css
```

#### Bullet Dots
```tsx
<span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
```

---

### Layout Utilities

| Utility | Value | Usage |
|---------|-------|-------|
| `section-pad` | `py-24 px-6 → md:px-12 → lg:px-24 → xl:px-32` | Outer section wrapper |
| `max-w-content` | `80rem` (`max-w-7xl`) | Max content width, centered with `mx-auto` |
| `max-w-prose` | `36rem` (`max-w-xl`) | Body text columns |
| `max-w-quote` | `42rem` (`max-w-2xl`) | Headlines and pull quotes |

---

### Typography Scale

| Element | Classes |
|---------|---------|
| H1 | `font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]` |
| H2 | `font-display text-3xl md:text-4xl font-bold tracking-tight` |
| H3 | `font-display text-lg font-semibold` |
| Body | `text-base md:text-lg leading-relaxed text-secondary-foreground` |
| Label | `text-xs tracking-wide uppercase text-muted-foreground` |
