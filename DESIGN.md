---
name: orbitDesk
description: Calm, dependable delivery-workspace UI with one confident blue accent
colors:
  orbit-blue: "#0066FF"
  orbit-blue-hover: "#0052CC"
  orbit-blue-strong: "#0040A8"
  orbit-blue-soft: "#E6F0FF"
  ink: "#1B2231"
  ink-muted: "#616C7E"
  ink-soft: "#9CA3AF"
  background: "#F7F9FB"
  surface: "#FFFFFF"
  surface-muted: "#F8F9FA"
  surface-strong: "#F1F3F5"
  border: "#E1E5EC"
  border-strong: "#D1D5DB"
  success: "#10B981"
  success-soft: "#D1FAE5"
  warning: "#F59E0B"
  warning-soft: "#FEF3C7"
  danger: "#EF4444"
  danger-soft: "#FEE2E2"
typography:
  display:
    fontFamily: "Sora, Nunito, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 1.4rem + 2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.orbit-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.orbit-blue-hover}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  status-pill:
    rounded: "{rounded.full}"
    padding: "4px 10px"
  sidebar-link-active:
    backgroundColor: "{colors.orbit-blue-soft}"
    textColor: "{colors.orbit-blue-strong}"
    rounded: "{rounded.md}"
---

# Design System: orbitDesk

## 1. Overview

**Creative North Star: "The Calm Control Room"**

orbitDesk is a control room for agency delivery: members and admins sit in front of it all day, so the surface stays quiet and the information stays loud. The canvas is a soft cool off-white (#F7F9FB) with pure-white cards floating on top; the only saturated color in the entire system is a single confident blue (Orbit Blue, #0066FF) reserved for the things you act on or the state you need to read. Rounded geometry (12-16px radii) and the humanist Nunito typeface keep it approachable rather than clinical, but the execution is crisp and precise: aligned spacing, consistent controls, no decorative noise.

This system explicitly rejects the generic AI-SaaS template look (gradient-on-everything, identical icon-heading-text card grids, a tracked uppercase eyebrow over every section, hero-metric scaffolding) and the dated corporate-console look (gray-on-gray chrome, clunky controls, modal-for-everything). Warmth is carried by type and roundness, never by gratuitous color or motion.

**Key Characteristics:**
- One accent (Orbit Blue) on a calm neutral field; everything else is ink and grayscale.
- White cards on a soft cool-neutral background; flat at rest, low ambient shadow.
- Rounded, humanist, friendly geometry executed with crisp precision.
- Status is always legible: tone color + label/dot, never color alone.
- Standard, consistent affordances screen to screen. The tool disappears into the task.

## 2. Colors

A grayscale-and-ink field punctuated by exactly one saturated hue. The blue does the pointing; the neutrals do the work.

### Primary
- **Orbit Blue** (#0066FF): The single brand accent. Used only for primary buttons, the current/active selection (active sidebar item, selected project card), focus rings, progress fill, and key interactive text. Never used as decoration or as a fill behind large passive areas.
- **Orbit Blue Hover** (#0052CC): Pressed/hover state of primary actions.
- **Orbit Blue Strong** (#0040A8): Text-on-tint (e.g. the label inside an active sidebar item over Orbit Blue Soft) where 4.5:1 contrast is required.
- **Orbit Blue Soft** (#E6F0FF): Low-saturation wash behind the active nav item, soft chips, and informational tints.

### Neutral
- **Ink** (#1B2231): Primary text and headings. The near-black with a faint blue cast that anchors the whole UI.
- **Ink Muted** (#616C7E): Secondary text, descriptions, table labels, helper copy.
- **Ink Soft** (#9CA3AF): Tertiary text, placeholders, disabled glyphs, section labels.
- **Background** (#F7F9FB): The app canvas; a soft cool off-white that lets white cards read as raised without shadow.
- **Surface** (#FFFFFF): Cards, panels, inputs, the sidebar.
- **Surface Muted** (#F8F9FA) / **Surface Strong** (#F1F3F5): Recessed sub-panels (kanban columns, inner stat tiles, empty states).
- **Border** (#E1E5EC): Default 1px hairline on cards, inputs, dividers.
- **Border Strong** (#D1D5DB): Input strokes and any border that must hold its own against white.

### Semantic
- **Success** (#10B981) / **Success Soft** (#D1FAE5): Completed status, success banners.
- **Warning** (#F59E0B) / **Warning Soft** (#FEF3C7): Pending status, caution.
- **Danger** (#EF4444) / **Danger Soft** (#FEE2E2): Errors, destructive actions.

### Named Rules
**The One Blue Rule.** Orbit Blue is the only saturated color in the product. It appears on roughly 10% or less of any screen, on the action or the active/selected state, never as decoration. If a screen looks blue, something passive has been painted that should be neutral.

**The Never-Color-Alone Rule.** Status is always carried by a tone color paired with a text label or a dot/icon, never by color alone. This keeps state legible for color-blind users and at a glance.

## 3. Typography

**Display Font:** Sora (with Nunito, system-ui fallback)
**Body Font:** Nunito (with system-ui fallback)

**Character:** Nunito is a rounded humanist sans that carries the entire UI (headings, labels, data, body) with a friendly, approachable tone. Sora steps in only for the largest hero/display heading to add a touch of geometric structure. One family does almost all the work; the pairing is a contrast accent, not a competition.

### Hierarchy
- **Display** (Sora 700, clamp(1.875rem -> 2.25rem), line-height 1.1, tracking -0.035em): Page hero titles only (`.hero-title`). The single place Sora appears.
- **Headline** (Nunito 700, 1.5rem, line-height 1.2, tracking -0.025em): Section titles (`.section-title`) at the top of a page or major panel.
- **Title** (Nunito 600, 1.125rem, line-height 1.3, tracking -0.02em): Panel and card headings.
- **Body** (Nunito 400-500, 0.875rem, line-height 1.5): The default UI text size. Descriptions and prose cap at 65-75ch; dense data may run wider.
- **Label** (Nunito 700, 0.6875rem, tracking 0.18em, UPPERCASE): Eyebrows and section labels (`.eyebrow`, `.sidebar-section-label`). Short only.

### Named Rules
**The One Family Rule.** Nunito carries headings, buttons, labels, data, and body. Reach for Sora only on a true page-hero display heading. A third typeface is prohibited.

**The Sparing Eyebrow Rule.** The uppercase tracked label is allowed as a deliberate, occasional kicker, never stamped above every section. If an eyebrow appears on most sections of a page, remove all but the one that earns it.

## 4. Elevation

Flat by default. Depth comes primarily from the contrast between pure-white surfaces and the soft cool-neutral background, plus a 1px hairline border, not from heavy shadows. Shadows are soft, low, and ambient: they suggest a sheet of paper resting on the canvas, never a dramatic float. Interaction adds a small, intentional lift.

### Shadow Vocabulary
- **Hairline / xs** (`box-shadow: 0 2px 4px rgba(28,35,51,0.04)`): Resting task cards and tiles.
- **Card** (`box-shadow: 0 4px 12px rgba(28,35,51,0.04), 0 1px 2px rgba(28,35,51,0.02)`): The default for surface cards and panels.
- **Soft / raised** (`box-shadow: 0 12px 24px -8px rgba(28,35,51,0.08)`): Larger floating panels.
- **Action glow** (`box-shadow: 0 4px 12px rgba(0,102,255,0.24)`): Primary buttons only; the one place color enters the shadow.
- **Hover lift** (`box-shadow: 0 8px 24px -12px rgba(0,102,255,0.3)`, plus `translateY(-1px)`): Interactive cards on hover.
- **Focus ring** (`box-shadow: 0 0 0 4px rgba(0,102,255,0.15)`): Inputs and focusable controls.

### Named Rules
**The Flat-By-Default Rule.** Surfaces sit flat on the canvas at rest. Lift (extra shadow + a 1px translate) is a response to hover or focus, not a resting decoration. If every card is floating dramatically while idle, the shadows are too strong.

## 5. Components

Buttons, cards, and inputs are crisp and confident: clean, precise, pro-grade execution carried on the brand's rounded geometry. Same shapes, same controls, every screen.

### Buttons
- **Shape:** Rounded (12px / `rounded-xl`).
- **Primary:** Orbit Blue fill, white text, font-weight 700, padding ~10px 16px, soft blue action glow. The single highest-emphasis control on a screen.
- **Hover / Focus:** Background shifts to Orbit Blue Hover (#0052CC) with a 1px upward translate. Focusable controls show the 4px Orbit Blue focus ring.
- **Secondary:** White background, 1px Border, Ink text. Hover fills with the muted accent (Surface Strong) and keeps Ink text. Used for the lower-emphasis of a button pair.
- **Icon button:** Square 40px, white, 1px border, same muted hover.

### Chips / Pills
- **Chip (`glass-chip`):** Soft neutral background, 1px border, pill (full radius), small bold text. Used for counts and metadata.
- **Status pill:** Tone-soft background + tone text (warning for pending, info/blue for assigned, success for completed), pill radius, capitalized. Always paired with a status dot of the same tone.

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) for cards and panels.
- **Background:** White surface on the soft-neutral canvas; recessed sub-panels use Surface Muted.
- **Shadow Strategy:** Card shadow at rest (see Elevation); interactive cards add the hover lift.
- **Border:** 1px Border hairline always.
- **Internal Padding:** 20-24px (`p-5` / `p-6`) for main cards; 16-20px for compact tiles.

### Inputs / Fields
- **Style:** White background, 1px Border Strong (#D1D5DB) stroke, 12px radius, ~10px 16px padding.
- **Focus:** Border shifts to Orbit Blue and a 4px `rgba(0,102,255,0.15)` ring appears. No layout shift.
- **Placeholder:** Ink Soft, but never below 4.5:1 against white.

### Navigation
- **Style:** Left sidebar on white, 1px right border. Items are rounded (12px), Nunito 500, Ink Muted by default.
- **Hover:** Fills with the muted accent, text to Ink.
- **Active:** Orbit Blue Soft (#E6F0FF) background with Orbit Blue Strong (#0040A8) text. One active item at a time.
- **Mobile:** Sidebar collapses to a top section above the content; layout is structural, not fluid type.

### Signature Component: Project Card (member projects)
A white card (16px radius, card shadow) presenting one project: a status dot + name + 2-line clamped description in the header, a status pill top-right, a 2x2 grid of mini stat tiles (Timeline / Planned / Phases / Sprints on Surface tint), and two equal-width footer actions (primary Details, secondary Tickets) pinned to the bottom so cards align regardless of description length. On hover the whole card lifts (translateY(-1px)) with the Orbit Blue hover-lift shadow and a blue border. This is the canonical pattern for representing an entity in a responsive grid; prefer it over wide horizontal-scroll tables.

## 6. Do's and Don'ts

### Do:
- **Do** keep Orbit Blue (#0066FF) for actions and active/selected state only, on ~10% or less of a screen (The One Blue Rule).
- **Do** pair every status color with a label or dot; never rely on color alone (The Never-Color-Alone Rule).
- **Do** keep surfaces flat at rest and reserve lift for hover/focus (The Flat-By-Default Rule).
- **Do** carry the UI in Nunito; use Sora only on a true page-hero heading (The One Family Rule).
- **Do** keep body and placeholder text at 4.5:1 or better against its background; push toward Ink rather than fading to light gray.
- **Do** honor `prefers-reduced-motion`: every hover lift / transition needs a reduced-motion alternative, and keep transitions in the 150-250ms range.
- **Do** reuse the same button, input, card, and pill across every screen; one "save" button shape everywhere.

### Don't:
- **Don't** ship the generic AI-SaaS template look: no gradient-on-everything, no identical icon-heading-text card grids repeated endlessly, no hero-metric scaffolding.
- **Don't** stamp a tiny uppercase tracked eyebrow above every section; one earns its place per page at most (The Sparing Eyebrow Rule).
- **Don't** drift back toward the dated corporate console: gray-on-gray chrome, clunky controls, a modal as the first answer to every interaction.
- **Don't** introduce a second saturated hue or a third typeface for flavor.
- **Don't** use a colored side-stripe border (`border-left`/`border-right` > 1px) on cards, rows, or alerts; use a full hairline, a tone-soft background, or a leading dot/icon instead.
- **Don't** use gradient text (`background-clip: text`) or decorative glassmorphism.
- **Don't** put delivery data behind a wide `min-width` horizontal-scroll table when a responsive card grid (see Project Card) reads better.
