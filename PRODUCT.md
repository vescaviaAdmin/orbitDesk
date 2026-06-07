# Product

## Register

product

## Users

Primary: delivery-team **members** and **admins** of an agency, working in an authenticated workspace daily.

- **Members** live in the delivery flow: opening assigned projects, moving tickets through status, raising requests, and referencing documents. They are task-focused and return many times a day, often jumping between several projects.
- **Admins** run the operational backbone: onboarding clients and members, creating projects, assigning members, and keeping the pipeline accurate. Their work is lower-frequency but higher-stakes (a wrong assignment or missing client blocks everyone downstream).
- Secondary: **clients** consume a focused portal to track project progress, raise issues, and read updates. They are not power users; clarity and reassurance matter more than density for them.

Context of use: desk work, on a laptop/desktop, during a workday, frequently with several projects in flight at once.

## Product Purpose

orbitDesk is an end-to-end agency delivery platform: a single source of truth that connects clients, delivery members, and admins across the full lifecycle of a project (onboarding, planning, tickets/issues, requests, documents, and status). Success means three things hold at once:

1. Clients feel confident and informed about delivery progress without needing to ask.
2. Members move through their daily work (tickets, projects, requests) with minimal friction.
3. Admins keep one accurate, trustworthy view of the entire delivery pipeline.

If any one of these breaks, the platform stops being the source of truth and people fall back to email and spreadsheets.

## Brand Personality

Calm, focused, dependable, with a touch of approachable warmth.

The interface should feel quiet and task-first: it gets out of the way so members and admins can work fast and clients can find answers at a glance. Warmth is carried through rounded typography and a single confident accent color, not through decoration or noise. It should read as a tool a professional trusts, not a toy and not a cold enterprise console.

Voice: plain, specific, and action-oriented. Labels say what will happen. No marketing buzzwords inside the app.

## Anti-references

- **Generic AI-SaaS template.** Gradient-on-everything, identical icon-heading-text card grids, a tracked uppercase eyebrow above every section, hero-metric scaffolding. The product must not feel interchangeable with a thousand other dashboards.
- **Dated corporate enterprise tooling.** Heavy chrome, dense gray-on-gray, clunky controls, modal-for-everything.
- **Over-animated / gimmicky motion** that gets between the user and their task.

## Design Principles

1. **The tool disappears into the task.** Earned familiarity over novelty. Standard affordances (side nav, tables, status pills, inline editing) behave exactly as a fluent user expects, so attention stays on the work.
2. **One accent, used with intent.** The vivid brand blue marks primary actions, current selection, and state, never decoration. Everything else is a calm neutral layer.
3. **Status legibility is the product.** Project/ticket state (pending, assigned, in-progress, completed) must be readable at a glance and consistent everywhere it appears, because the whole value proposition is a trustworthy shared view.
4. **Clarity scales to the audience.** Members and admins get density and speed; clients get a calmer, more guided, lower-density version of the same truth.
5. **Consistency over surprise.** The same button, form control, card, and spacing vocabulary screen to screen. Delight lives in small moments (a hover, an empty state), not on every page.

## Accessibility & Inclusion

No formal conformance target required. Bake in reasonable, non-negotiable defaults: body-text contrast that stays comfortably readable (avoid light-gray-on-tint), visible keyboard focus states on all interactive controls, and `prefers-reduced-motion` honored for any transition. Don't rely on color alone to convey status (pair color with a label or icon), which also helps color-blind users.
