# Ginga — Sailor capture page

Design spec for build. Hand this to Claude Code together with the reference
component. Everything below is decided; nothing here needs interpretation.

---

## What this is

The page a sailor lands on from a link Rich sends in WhatsApp.
No login. No app. They tap the link and answer.

**Core principle: the link decides what they see. The sailor just answers.**

No menu, no tabs, no mode picker. A sailor must never wonder
"what is this, what's behind here, what are my options."

---

## Three modes

One page, three modes. The URL determines the mode — the sailor never chooses.

| Mode | When | URL shape | Questions |
|---|---|---|---|
| `priming` | Night before a session or race day | `/c/{token}` | 3, from Rich's priming set |
| `capture` | ~15 min after docking / after a session | `/c/{token}` | 3–5, from Rich's capture set |
| `note` | Any time, sailor-initiated | `/n/{token}` | none — free-form |

`{token}` is a per-sailor, per-run opaque string (e.g. `a7f3k2`).
It identifies the sailor and the capture run. No auth challenge.

---

## Layout

Single column, mobile-first. Max width 420px, centred on larger screens.
Full viewport height, flex column.

```
┌─────────────────────────────┐
│ header    (fixed height)    │  kicker + title, sailor name + role
├─────────────────────────────┤
│ progress  (3px bar)         │  one segment per question — omit in note mode
│ context   (optional card)   │  conditions / their own goal — see below
│                             │
│ question   (flex: 1)        │  the only thing that matters
│                             │
├─────────────────────────────┤
│ actions   (fixed bottom)    │  record button + text fallback
└─────────────────────────────┘
```

---

## Colours

Exact values. These are Ginga's palette — do not substitute.

```
paper      #F7F4ED   page background
sand       #EDE7DA   context cards
line       #DDD5C4   dividers, borders
green      #00A651   accent, record button, progress fill
greenLt    #E6F4EA   success wash
clay       #C4622D   recording state
ink        #1A1A18   primary text
warm       #6B6459   secondary text
warmLt     #8E877A   labels, hints
```

Never use pure black, pure white, or grey. The page is warm ivory throughout.

---

## Typography

Two families.

**Display** — headings and the question itself.
`'Archivo Narrow', 'Roboto Condensed', 'IBM Plex Sans Condensed', system-ui, sans-serif`
Condensed, editorial, slightly industrial.

**UI** — everything else.
`'Inter', 'IBM Plex Sans', -apple-system, system-ui, sans-serif`

| Element | Family | Size | Weight | Colour |
|---|---|---|---|---|
| Kicker (`RACE DAY 2 · SASSNITZ`) | UI | 11px | 600 | warmLt |
| Page title (`Capture`) | Display | 25px | 700 | ink |
| Sailor name | UI | 12px | 600 | ink |
| Sailor role | UI | 11px | 400 | warmLt |
| Context label | UI | 11px | 600 | warmLt |
| Context body | UI | 12.5px | 400 | ink |
| Question label (`QUESTION 2`) | UI | 11px | 600 | green |
| **Question** | Display | 23px | 600 | ink |
| Record button | UI | 14px | 600 | white |
| Text fallback link | UI | 12px | 400 | warmLt |

All small labels: `text-transform: uppercase; letter-spacing: 0.11em`.
Never below 11px.

---

## Spacing and shape

- Page padding: 19px horizontal
- Border radius: 8px on cards and buttons, 12px on the outer frame
- Dividers: 1px solid `line`
- **No shadows. No gradients.** Flat surfaces only.
- Context card: `border-left: 2px solid green`, with left corners square
  (never round a single-sided border)

---

## Header

```
RACE DAY 2 · SASSNITZ              Rasmus
Capture                            Flight Controller
```

Kicker and title left, sailor name and role right-aligned.
Bottom border 1px `line`.

Title text by mode:
- `priming` → "Priming"
- `capture` → "Capture"
- `note` → "A thought"

Kicker by mode:
- `priming` → "TOMORROW · {VENUE}"
- `capture` → "{DAY} · {VENUE}"
- `note` → "{VENUE} WEEK"

---

## Progress bar

One segment per question, 3px tall, 3px gap, full width.
Filled segments (`index <= current`) use `green`; the rest use `line`.

**Omit entirely in note mode.**

---

## Context card

Appears above the question. Optional — only when there is something worth
showing. Its content is what makes the answer better, not decoration.

| Mode | When | Label | Content |
|---|---|---|---|
| `priming` | question 1 | CONDITIONS | forecast + expected config, one line |
| `capture` | the question about goals | YOUR GOAL THIS MORNING | their own priming answer, verbatim |
| `capture` | last question | TODAY'S SQUAD GOALS | the 2–3 squad goals, numbered |
| `note` | always | — | the reassurance line (see note mode) |

Never invent context. If the data isn't there, omit the card.

---

## Question area

The question is the largest text on the page. It gets the space.
`flex: 1` so the record button stays pinned to the bottom regardless of
question length.

Label above it: `QUESTION {n}` in green.

---

## Actions

### Voice (default)

Full-width button, 12px vertical padding, radius 8px.

| State | Background | Label |
|---|---|---|
| idle | green | "Hold to record" |
| recording | clay | "Stop and send" |

While recording, show above the button: a clay dot, an `mm:ss` timer in
display font at 19px, and a simple waveform (12 bars, 2.5px wide, green,
varying heights, opacity animating).

Below the button, centred: "or type instead" — 12px, warmLt, no underline.

### Text

Textarea replaces the waveform area: min-height 100px, 1px `line` border,
radius 7px, background `#FFFDF8`, 13.5px, line-height 1.55.

Button becomes "Send answer". Disabled (background `sand`, text `warmLt`)
until the field has content.

Below: "or record instead".

**Text is a first-class input, not a fallback.** Some sailors prefer typing.

---

## Recording

Use `MediaRecorder` with `navigator.mediaDevices.getUserMedia({ audio: true })`.

- Preferred MIME: `audio/webm;codecs=opus`, fall back to `audio/mp4` on iOS Safari
- Request permission on first record tap, not on page load
- If permission is denied: switch to text mode silently and show
  "Recording isn't available — type your answer instead" once, in warm
- Keep the blob in memory; upload on submit
- No playback, no re-record, no editing. Speak, send, next question.
  (If this proves wrong in testing, add re-record — but start without it.)

---

## Flow

1. Sailor opens the link
2. Question 1 appears immediately — no splash, no welcome, no login
3. They record or type, then send
4. Next question, progress advances
5. After the last: confirmation screen

### Confirmation screen

- Green circle with a check, 38px
- Display heading: "All in." / "Thanks, {firstName}."
- Body: what happens next — their answers go into tonight's debrief picture,
  and they'll get their own summary afterwards
- List of what they sent: question, and either duration (`42s`) or `TEXT`
- Pinned at the bottom: the next meeting, e.g. "Debrief 19:30 — tent."

### Note mode

No progress bar, no question label. Just:

- Prompt text, 16px, warm, weight 400: "Something on your mind? Say it here."
- Sand card: "Yours until you choose to share it."
- Record button

After sending, offer three choices — keep private (default), share with Rich,
share with the team. Default is private. The sailor owns their reflection.

---

## Data contract

### In

```json
{
  "token": "a7f3k2",
  "mode": "capture",
  "sailor": { "firstName": "Rasmus", "role": "Flight Controller" },
  "event": { "venue": "Sassnitz", "dayLabel": "Race day 2" },
  "questions": [
    { "id": "q1", "text": "What is the main thing on your mind?" },
    { "id": "q2", "text": "Did you achieve the goals you set this morning?",
      "context": { "label": "YOUR GOAL THIS MORNING",
                   "body": "Make the first call one phase earlier." } }
  ],
  "nextMeeting": "Debrief 19:30 — tent"
}
```

Questions are fetched when the page opens, never baked in.
**Rich edits them centrally; the next sailor to open sees the new set.**

Freeze the question-set version when a run is sent. If Rich edits after some
sailors have answered, that creates version 2 — answers stay attached to the
version they answered, so the synthesis keeps them apart.

### Out

One request per answer, so a dropped connection loses one answer, not all.

```
POST /api/capture/{token}/answer
  questionId, questionSetVersion, kind ("voice"|"text"),
  audio (blob) | text (string), durationMs, clientSentAt
```

---

## What this page must never do

- Ask the sailor to log in
- Show more than one question at a time
- Show a menu, tabs, or a mode picker
- Explain what Ginga is or why they're answering
- Show prompts, JSON, model names, or any system scaffolding
- Score, rate, or judge the sailor
- Block on a slow upload — queue and retry in the background

---

## Accessibility

- Record button: minimum 44px tap target
- `aria-live="polite"` on the progress indicator
- Timer readable by screen reader as "recording, 42 seconds"
- Full keyboard path through text mode
- Every colour pair meets WCAG AA on the ivory background
