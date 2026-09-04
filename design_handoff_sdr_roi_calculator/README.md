# Handoff: SDR ROI Calculator

## Overview
An interactive calculator comparing the fully-loaded monthly/annual cost of hiring an SDR in-house versus partnering with demandDrive at a flat rate. Users adjust cost sliders (or accept pre-set averages) and a team-size slider; the page recomputes and displays cost breakdowns and savings live, client-side, with no backend.

## About the Design Files
The bundled file (`source/SDR-ROI-Calculator.dc.html`) is a **design reference** built in an internal prototyping format (a custom `{{ }}` templating + runtime script, not plain HTML/JS). It renders correctly only inside that tool's preview — it will not run as-is in a browser or on Vercel. Treat it purely as the spec for markup, copy, layout, styling, and interaction/calculation logic. **Recreate it as a plain static site (HTML/CSS/vanilla JS, or a lightweight React app if preferred)** deployable on Vercel as a static build.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and all calculation logic below are final — implement pixel- and logic-accurate.

## Screens / Views
Single page, no routing.

### SDR ROI Calculator (single view)
**Purpose:** let a visitor estimate in-house SDR cost vs. demandDrive's flat rate and see savings.

**Layout** (max-width 1160px, centered, 24px side padding, 56px top / 96px bottom padding):
1. **Header row** — flex, space-between: demandDrive logo (SVG, 30px tall) on the left; small eyebrow label "SDR HIRING · ROI CALCULATOR" on the right (DM Sans 500, 14px, wide letter-spacing, muted navy). 1px bottom border, 20px padding-bottom, 40px margin-bottom.
2. **Title** — H1 "What is hiring an SDR really costing you?", Outfit Regular 400, 56px, max-width 820px.
3. **Subtitle** — paragraph, DM Sans, 18px, muted navy (`rgba(10,14,69,0.8)`), max-width 680px, line-height 1.65: "Sales leaders budget for salary. The fully loaded number is bigger, and it hits every month whether or not the rep is producing. Adjust the inputs below, or use our averages if you are not sure."
4. **Team size card** — white card, 1px border (#E2ECFA), 14px radius, 28×32px padding, flex row wrap, gap 32px:
   - Left: eyebrow "TEAM SIZE"; big number `{teamSize} SDR(s)` (Outfit 48px + DM Sans 18px suffix) — displays "5+" once the slider hits its max.
   - Right: range slider, min 1, max 5 (5 means "5+"), step 1, flex-grow, styled per the gradient slider spec below.
5. **Two-column grid** (1.3fr / 1fr, 24px gap, align-start):
   - **Left card "Building in-house"** (white bg, bordered, 14px radius, 32px padding): eyebrow, big total `${inHouseMonthlyPerRep}/mo` (Outfit 48px), caption "fully loaded cost, per rep", then 6 stacked line-item rows (each: 1px top border, 18px vertical padding) — label (DM Sans 500) + right-aligned dollar/percent value (Outfit 22px) on top row; optional caption helper text; below that a gradient range slider (flex-grow, disabled + 45% opacity when "use average" is checked) plus a "use average" checkbox+label (14px, muted navy, checkbox accent navy `#0A0E45`).

**Slider styling (all range inputs, team size + the 6 cost sliders):** track is the brand highlight gradient (`linear-gradient(90deg, #FF6300 0%, #FF6262 33%, #0195FF 66%, #00DD84 100%)`), 6px tall, fully rounded (999px). Thumb is a solid navy (`#0A0E45`) circle, 18px diameter, 2px white border, soft shadow. Requires custom `::-webkit-slider-thumb`/`::-webkit-slider-runnable-track` and `::-moz-range-thumb`/`::-moz-range-track` CSS (native `accent-color` cannot render a gradient track) — see the `.dd-range` class in the source file's `<style>` block for the exact rules to port.
   - **Right card "Partnering with demandDrive"** (navy bg `#0A0E45`, white text, 14px radius, 32px padding): eyebrow (light neutral `#CDDBEE`), big per-rep rate for the current team size (Outfit 48px, see pricing tiers below), caption "all-inclusive, per rep — rate improves as your team grows", then 5 static rows (label left, value right — "included" ×4, "carried by us" ×1) each with 1px top border in `rgba(255,255,255,0.2)`, and a final row "Ramp to full productivity → 2–4 weeks" (bold). The "Full tech & data stack" row carries an asterisk; below the rows a small footnote (12px, `#CDDBEE`): "*Does not include CRM or Clay."
6. **Savings banner** — full-width, blue bg (`#0062DF`), white text, 14px radius, 36×40px padding, flex row space-between wrap, gap 32px:
   - Left: H3 headline, e.g. "Save roughly $14,700 a year, per rep." (Outfit 42px); paragraph below explaining the comparison basis (14px, 85% white).
   - Right: two stat blocks side by side ("PER REP" and "YOUR TEAM"), each showing `$X/mo` (Outfit 42px) and `$Y/yr` below (14px, 85% white).
7. **Footnote** — caption text (12px, muted navy, max-width 720px): "Cost ranges reflect 2025–2026 industry benchmarks (Bridge Group, Pavilion, BLS). Actual costs vary by market and seniority. Figures here are estimates to guide planning, not a quote."

## Interactions & Behavior
- **Team size slider** (1–5, where 5 displays as "5+"): updates `teamSize` state; recomputes the demandDrive per-rep rate (tiered, see below) and team totals everywhere they're shown.
- **6 cost sliders**, each paired with a "use average" checkbox (checked by default):
  1. Base salary + commission — $4,500–$8,500/mo, step 50, default average $6,450
  2. Payroll tax & benefits — 20–35%, step 1, default average 28% (applied as % of base salary + commission to get a $ line value)
  3. Tech stack & data seats — $300–$1,000/mo, step 25, default average $625
  4. Management & QA oversight — $900–$2,400/mo, step 50, default average $1,600
  5. Recruiting, onboarding & turnover — $1,000–$3,500/mo, step 50, default average $2,250 (baseline value assumes 39% attrition; see formula below)
  6. Annual attrition rate — 15–60%, step 1, default average 39%
  - Checking "use average" resets that slider to its default and disables/dims it (opacity 0.45); unchecking re-enables dragging from its current value.
- No submit button, no CTA, no backend calls — everything recomputes live on every input event.
- No hover hijinks beyond standard slider/checkbox affordances. Standard link hover color if any links are added: navy → orange (`#FF6300`).

## Calculation Logic (implement exactly)
```
payrollBenefits   = baseSalary * (payrollPct / 100)
recruitingAdjusted = recruiting * (attritionPct / 39)   // 39 = the attrition default baseline
inHouseMonthlyPerRep = baseSalary + payrollBenefits + techStack + mgmtQA + recruitingAdjusted

// demandDrive per-rep rate is tiered by team size (volume pricing):
ddRateTiers = { 1: 11500, 2: 11000, 3: 10750, 4: 10250 }
ddMonthlyPerRep = ddRateTiers[teamSize] ?? 10000   // 10000 flat for 5 or more reps

savingsPerRepMonthly = inHouseMonthlyPerRep - ddMonthlyPerRep
savingsPerRepAnnual  = savingsPerRepMonthly * 12
savingsTeamMonthly   = savingsPerRepMonthly * teamSize
savingsTeamAnnual    = savingsPerRepAnnual * teamSize
```
Format all dollar figures rounded to the nearest whole dollar with a `$` prefix and thousands separators (e.g. `$12,700`). If savings go negative (demandDrive costs more), the headline copy should flip to: "demandDrive costs $X more a year, per rep." — this is an edge case worth handling but unlikely at default ranges.

## State Management
- `teamSize: number` (1–5, default 3; 5 represents "5 or more")
- `values: { baseSalary, payrollPct, techStack, mgmtQA, recruiting, attrition }` (defaults above)
- `useAvg: { baseSalary, payrollPct, techStack, mgmtQA, recruiting, attrition }` (all `true` by default)
- No persistence/backend required; local component state is sufficient. (Optional nice-to-have: persist to `localStorage` so a returning visitor keeps their inputs.)

## Design Tokens
Colors:
- Navy `#0A0E45` (headings, primary text, dark card bg)
- Blue `#0062DF` (accent, slider thumb, savings banner bg)
- Green `#00DD84` (not used on this screen, brand success color)
- Orange `#FF6300` (hover states only — link/button hover if added)
- Neutral 1 `#F3F8FF` (page background)
- Neutral 2 `#E2ECFA` (borders)
- Neutral 3 `#CDDBEE` (muted text on navy)
- White `rgba(255,255,255,0.2)` (borders on navy/blue surfaces)

Typography:
- Headings: **Outfit**, weight 400 (regular — not bold), tight line-height (~1.05), tracking -0.01em. Sizes used: 56px (H1), 48px (H2/big numbers), 42px (H3/stat numbers), 22px (row values).
- Body/UI: **DM Sans**, weight 400 body / 500 labels & supertext / 600 if any menu-style text. Sizes: 18px (subtitle), 17px (body default), 14px (supertext/eyebrows, uppercase, +6% letter-spacing), 12px (captions/footnotes).

Spacing: 4/8/12/16/20/24/32/40/56/72/96/128px scale. Card padding 32px, card gap 24px, section margin-bottom ~32–48px.

Radius: 6px (buttons/inputs if added), 14px (cards).

Shadows: not used on this screen (flat cards with borders only).

## Assets
- `assets/logo-demanddrive.svg` — full-color demandDrive logo, used on the light page background.
- Fonts: Outfit (400, 500) and DM Sans (400, 500, 600) — load from Google Fonts:
  `https://fonts.googleapis.com/css2?family=Outfit:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap`

## Vercel Deployment Guide

This is a static, client-only page — no server, no API routes, no database. Vercel's simplest "static site" flow applies.

### Option A — plain HTML/CSS/JS (recommended for this scope)
1. Recreate the design as `index.html` (+ optionally `style.css`, `script.js`) implementing everything in this README.
2. Put it in a folder, e.g. `sdr-roi-calculator/`, with `assets/logo-demanddrive.svg` alongside it.
3. Initialize git and push to a GitHub repo:
   ```
   git init
   git add .
   git commit -m "SDR ROI calculator"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
4. Go to vercel.com → **Add New Project** → import that GitHub repo. Vercel auto-detects a static site (no framework, no build command needed — leave "Build Command" and "Output Directory" blank, or set Output Directory to `.`).
5. Click **Deploy**. Vercel gives you a live `*.vercel.app` URL immediately; every push to `main` auto-redeploys.
6. Optional: add a custom domain under Project → Settings → Domains.

Alternatively, skip GitHub for a one-off deploy: install the CLI (`npm i -g vercel`), run `vercel` inside the project folder, and follow the prompts (`vercel --prod` to push straight to production).

### Option B — React/Vite app (if the team wants component structure or plans to extend it)
1. Scaffold: `npm create vite@latest sdr-roi-calculator -- --template react`
2. Implement the layout/logic from this README as components (state per the **State Management** section).
3. Push to GitHub, import into Vercel the same way — Vercel auto-detects Vite and sets the build command (`npm run build`) and output directory (`dist`) for you.
4. Deploy.

Either option needs zero environment variables and zero backend config — this calculator has no external calls.

## Files
- `source/SDR-ROI-Calculator.dc.html` — full design reference (markup + inline styles + calculation logic in the component's JS class). Read the JS class at the bottom of the file for the exact state shape, handlers, and formatting helper (`fmt()`).
- `assets/logo-demanddrive.svg` — logo asset.
