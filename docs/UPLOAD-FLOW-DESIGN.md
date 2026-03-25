# BeTalent Video Upload Flow

**UX architecture · Premium, simple upload experience**  
*Seven-step flow from genre selection to publish. Music-first; metadata feeds the recommendation algorithm.*

---

## 1. Design principles

### 1.1 Premium and simple

- **Premium:** Clear hierarchy, generous spacing, confident typography, minimal clutter. Each step has one clear job. Progress is visible; the creator feels in control.
- **Simple:** No unnecessary fields. Required inputs are obvious. Optional steps (style tags, song/artist) are clearly optional. Back/next and step indicators are consistent.
- **Music-first:** The flow leads with **genre** and **performance type** so every upload is categorized before the video is even selected. This reinforces platform identity and ensures algorithm-ready metadata.

### 1.2 Flow at a glance

| Step | Name | Purpose | Required |
|------|------|---------|----------|
| 1 | Select Genre | Choose primary music style | Yes |
| 2 | Select Performance Type | Choose how the piece is delivered | Yes |
| 3 | Optional Style Tags | Add vocal/performance character | No |
| 4 | Upload Video | Select file; validate duration, aspect, audio | Yes |
| 5 | Video Details | Title, description, optional song/artist | Yes (title) |
| 6 | Preview | See feed card as it will appear | — |
| 7 | Publish | Submit to moderation or go live | — |

- **Linear progression** with ability to go **back** and change previous steps. No branching; one path.
- **Progress indicator** visible on every step (e.g. “Step 2 of 7” and a visual stepper).

---

## 2. Step 1 — Select Genre

### 2.1 Purpose

- Capture **primary genre** (required) so the performance is categorized for genre pages, For You, challenges, and ranking.
- Set the tone: “This is a music platform; we care what kind of music this is.”

### 2.2 UI structure

- **Screen title:** e.g. “What genre?” or “Select genre” — short and clear.
- **Subtitle (optional):** e.g. “Choose the main style of your performance.”
- **Large genre cards** in a scrollable grid (e.g. 2 columns on mobile, 3–4 on desktop).
  - Each card: **genre name** as primary label; optional small icon or color accent per genre.
  - Card state: default, hover/focus, **selected** (clear visual: border, fill, or checkmark).
  - **Single selection:** selecting another genre deselects the previous.
- **Primary action:** “Next” (or “Continue”) — enabled only when one genre is selected. Disabled state when none selected.
- **No “Skip”** — genre is required.

### 2.3 Genre list (display order)

Pop · R&B · Soul · Jazz · Rock · Rap / Hip-Hop · Gospel · Classical · Country · Latin · Indie · Alternative · Afrobeat · Blues · EDM · Folk · Reggae  

*(17 genres; same as CATEGORY-SYSTEM Level 1. Store as slug, e.g. `pop`, `rnb`, `soul`.)*

### 2.4 Layout and behavior

- Cards are **large enough to tap comfortably** (min touch target 44px height). Padding between cards so the grid doesn’t feel cramped.
- Scroll: vertical scroll if needed; optional horizontal scroll for a single row is an alternative but grid is preferred for discoverability.
- **Accessibility:** Focus order follows grid; selected state is announced; “Next” is focusable and activated by keyboard when genre is selected.

---

## 3. Step 2 — Select Performance Type

### 3.1 Purpose

- Capture **performance type** (required): cover, original, acoustic, piano, guitar, live session, or acapella.
- Complements genre; together they define “what kind of performance” for algorithm and filters.

### 3.2 UI structure

- **Screen title:** e.g. “How are you performing?” or “Performance type.”
- **Subtitle (optional):** e.g. “Cover, original, or specific setup.”
- **Performance type options** as **large cards** or **list tiles** (single selection).
  - Options: Cover · Original Song · Acoustic · Piano · Guitar · Live Session · Acapella.
  - Same interaction as genre: one selected, clear selected state, “Next” enabled only when one is selected.
- **Primary action:** “Next.”
- **Secondary:** “Back” to Step 1.

### 3.3 Performance type list (display order)

Cover · Original Song · Acoustic · Piano · Guitar · Live Session · Acapella  

*(7 types. Map to category slugs for storage: `cover`, `original-song`, `acoustic-version`, `piano-version`, `guitar-version`, `live-session`, `acapella`. “Studio Style” omitted in this flow; can be added later if needed.)*

### 3.4 Layout and behavior

- Same premium card/tile treatment as genre. Can be slightly more compact (e.g. list of 7) or same 2-column grid.
- **Back** returns to Step 1 without losing Step 2 choice if user had already selected; on re-entry to Step 2, show previously selected type if any.

---

## 4. Step 3 — Optional Style Tags

### 4.1 Purpose

- Add **vocal/performance character** (optional) for better discovery and “similar to” signals.
- Clearly optional so creators don’t feel blocked.

### 4.2 UI structure

- **Screen title:** e.g. “Add style tags (optional)” or “Describe your sound.”
- **Subtitle:** e.g. “Help people find you. You can skip this.”
- **Style tags** as **multi-select chips or toggles** (not single-select).
  - Options: Power Vocal · Soul Voice · Soft Voice · High Note · Emotional.
  - Zero or more selectable; selected state clear (e.g. filled chip, checkmark).
- **Primary action:** “Next” — **always enabled** (even with zero tags).
- **Secondary:** “Back” to Step 2; “Skip” optional (same as “Next” with zero tags).

### 4.3 Style tag list (display order)

Power Vocal · Soul Voice · Soft Voice · High Note · Emotional  

*(5 tags in this flow. Map to taxonomy slugs for storage: e.g. `power-vocal`, `soul-voice`, `soft-vocal`, `high-note-specialist`, `emotional-performance`.)*

### 4.4 Layout and behavior

- Chips or compact buttons in a wrap layout; multi-select, no limit (or a soft cap e.g. 5 for UI simplicity).
- **Skip** can be explicit (“Skip for now”) or implied (Next with zero selected). Either way, optional is obvious.

---

## 5. Step 4 — Upload Video

### 5.1 Purpose

- Creator selects the **video file**; client validates duration, aspect ratio, and (where possible) basic audio quality.
- Only valid files proceed to Step 5.

### 5.2 UI structure

- **Screen title:** e.g. “Upload your performance” or “Add your video.”
- **Subtitle:** Show requirements clearly:
  - **Max 90 seconds**
  - **Vertical video**
  - **Good audio quality**
- **Upload area:**
  - **Primary:** Large drop zone + “Choose file” (or “Select video”). Drag-and-drop and click-to-browse.
  - **After select:** Thumbnail/preview + filename + duration + aspect ratio (if available). If validation fails, show **inline errors** (see 5.4).
- **Primary action:** “Next” — enabled only when a valid file is selected and client-side checks pass.
- **Secondary:** “Back” to Step 3; “Remove” / “Change video” to clear and re-select.

### 5.3 Requirements (enforcement)

| Requirement | Client-side check | User message if failed |
|-------------|-------------------|------------------------|
| Max 90 seconds | Duration ≤ 90s after file load/metadata read | “Video must be 90 seconds or shorter.” |
| Vertical video | Aspect ratio portrait (e.g. height > width; e.g. ratio ≥ 0.5625 for 9:16) | “Please use a vertical (portrait) video.” |
| Good audio | Optional: basic presence (e.g. has audio track). Advanced checks (loudness, clarity) can be server-side later. | “Video must have an audio track.” |

- If file is too long: show exact duration and “Trim to 90s” or “Choose a shorter clip” (trimming can be a later feature).
- **Loading state:** While reading metadata or uploading in background, show spinner/skeleton and disable Next until ready.

### 5.4 Layout and behavior

- Drop zone is the main focus: large, dashed or soft border, icon + short instruction.
- After selection: preview (first frame or poster) + short summary (duration, aspect). Errors directly under preview or in a compact alert.
- **No auto-advance** on file select; user taps “Next” after reviewing. Optionally start upload in background on “Next” (see Step 7).

---

## 6. Step 5 — Video Details

### 6.1 Purpose

- Collect **title** (required) and **description** (required or optional by product rule).
- **Song name** and **Artist name** optional — for covers and discovery.

### 6.2 UI structure

- **Screen title:** e.g. “Video details” or “Add details.”
- **Fields:**
  - **Title** — single line; required; placeholder e.g. “Give your performance a title”; max length (e.g. 100 chars).
  - **Description** — multiline; optional or required; placeholder e.g. “Tell viewers about this performance”; max length (e.g. 500 chars).
  - **Song name (optional)** — single line; placeholder e.g. “Song title (if cover)”.
  - **Artist name (optional)** — single line; placeholder e.g. “Original artist (if cover)”.
- **Primary action:** “Next” — enabled when required fields (e.g. title) are valid.
- **Secondary:** “Back” to Step 4.

### 6.3 Validation

- **Title:** Required; trim whitespace; reject empty; show inline error “Title is required” or “Please enter a title.”
- **Description:** If required, same as title; otherwise optional.
- **Song / Artist:** No validation beyond max length; optional.

### 6.4 Layout and behavior

- Form layout: one column on mobile; same on desktop with max width for readability.
- Labels above or floating; errors below field or under the input with aria-describedby.
- **Character count** optional for title and description (e.g. “45 / 100”).

---

## 7. Step 6 — Preview

### 7.1 Purpose

- Show the **feed card** exactly as it will appear in the feed (or as close as possible).
- Build confidence and reduce “what did I just publish?” anxiety.

### 7.2 UI structure

- **Screen title:** e.g. “Preview” or “Here’s how it will look.”
- **Preview card:**
  - **Same layout as feed card:** thumbnail/poster, title, creator avatar and name, genre/performance type (if shown on card), optional view/like counts (can show “—” or “0” for new).
  - **Dimensions and styling** match the main app feed (same aspect, same typography, same padding).
  - Card can be **scrollable** if feed card has more content (e.g. description expandable).
- **Primary action:** “Publish” (or “Post”).
- **Secondary:** “Back” to edit details (Step 5); optional “Edit details” that goes back to Step 5.

### 7.3 Layout and behavior

- Preview area is the main focus; card centered or aligned to feed alignment.
- Optional: small caption “This is how your performance will appear in the feed.”
- **No editing on this step** — editing is “Back” to the relevant step. Optional future: “Edit title” that expands or goes to Step 5.

---

## 8. Step 7 — Publish

### 8.1 Purpose

- Submit the video to the **moderation queue** or **directly live** (product decision).
- Show clear success state and next steps.

### 8.2 UI structure

- **Before submit:**
  - Optional final “Publish” confirmation (e.g. “Post to BeTalent?”).
  - **Primary action:** “Publish” (or “Post”). On tap: show loading state (spinner, “Publishing…”), disable button.
- **After submit (success):**
  - **If moderation:** “Submitted for review” (or similar). Short copy: “We’ll notify you when it’s live” or “Usually reviewed within X hours.”
  - **If direct live:** “Your performance is live” (or similar). CTA: “View in feed” or “Share.”
- **After submit (error):**
  - Inline or modal: “Something went wrong. Please try again.” Retry button; optional “Save draft” if product supports it.

### 8.3 Moderation vs direct live

- **Moderation queue:** Video is stored with status “pending_review”; not shown in feed until approved. Creator can see “Under review” in their content list.
- **Direct live:** Video is stored with status “live” (or “published”) and appears in feed subject to algorithm. Optional post-upload moderation (reactive) is a separate product decision.
- Design supports both; copy and CTAs switch based on config.

### 8.4 Layout and behavior

- Loading state: full-screen or inline spinner; no double submit (disable Publish until request completes).
- Success: clear headline + short explanation + one primary CTA. Optional secondary “Upload another.”

---

## 9. Metadata stored for the recommendation algorithm

The system must persist the following (and any extra needed for product):

| Field | Source | Type | Notes |
|-------|--------|------|--------|
| **genre** | Step 1 | string (slug) | e.g. `soul`, `gospel`. From Level 1. |
| **performanceType** | Step 2 | string (slug) | e.g. `cover`, `acoustic-version`. From Level 2. |
| **tags** | Step 3 | array of strings (slugs) | e.g. `["power-vocal", "emotional-performance"]`. From Level 3. Can be empty. |
| **creatorID** | Session / auth | string (ID) | Creator who uploaded. |
| **uploadTime** | Server or client | datetime (ISO or timestamp) | When the upload was submitted. |
| **title** | Step 5 | string | |
| **description** | Step 5 | string | Optional. |
| **songName** | Step 5 | string | Optional. |
| **artistName** | Step 5 | string | Optional. |
| **durationSeconds** | Step 4 (from file) | number | ≤ 90. |
| **aspectRatio** | Step 4 (from file) | string or number | e.g. `9:16` or width/height. |
| **status** | Step 7 | enum | e.g. `pending_review`, `live`, `rejected`. |

- **genre**, **performanceType**, and **tags** are the **category metadata** referenced in DISCOVERY-AND-RANKING-ALGORITHM.md and CATEGORY-SYSTEM.md for For You, genre pages, challenges, and ranking.
- **creatorID** and **uploadTime** are required for ranking, freshness, and attribution.

---

## 10. Flow summary and UI structure

### 10.1 Step sequence

1. **Select Genre** → large genre cards, single select, Next.
2. **Select Performance Type** → large cards/tiles, single select, Next.
3. **Optional Style Tags** → multi-select chips, Next (or Skip).
4. **Upload Video** → drop zone, validation (90s, vertical, audio), Next.
5. **Video Details** → title (required), description, song/artist (optional), Next.
6. **Preview** → feed card preview, Publish.
7. **Publish** → submit, loading, success/error, CTAs.

### 10.2 Global UI structure (all steps)

- **Progress:** Stepper or “Step X of 7” at top; optional progress bar.
- **Back:** Consistent placement (e.g. top-left or below progress); always returns to previous step and keeps prior choices.
- **Primary action:** Bottom or top-right; label “Next” (Steps 1–5), “Publish” (Step 6/7). Disabled when step is invalid.
- **Layout:** Single column for content; max width on desktop; full-bleed or padded per design system.
- **Exit:** Optional “Cancel” or “Close” (e.g. top-right); confirm if any data entered (“Discard draft?”).

### 10.3 State and persistence

- **Draft (optional):** If product supports “Save draft,” store step index + form values (genre, performanceType, tags, title, description, song, artist) in local storage or backend draft; video file may be re-selected or re-uploaded on resume.
- **Session:** If user leaves and returns, decide whether to restore last step and form data (session storage or draft) or start fresh.

---

## 11. Error and edge cases

| Scenario | Handling |
|----------|----------|
| No genre selected | Next disabled; no error message needed if affordance is clear. |
| No performance type selected | Same as genre. |
| Video > 90s | Inline error under preview; suggest trim or different file. |
| Video not vertical | Inline error; explain “Use a vertical (portrait) video.” |
| No audio track | Inline error if detectable client-side. |
| Empty title | Inline error on blur or on Next: “Title is required.” |
| Network failure on Publish | Error message + Retry; optional “Save draft.” |
| Session expired during flow | On Next/Publish, redirect to login and optionally preserve draft. |

---

## 12. Out of scope (for later)

- **Trim to 90s** in-app (could be added at Step 4).
- **Filters / effects** (music platform may keep raw performance).
- **Thumbnail pick** (can default to first frame or a chosen frame later).
- **Schedule publish** (e.g. “Publish at…”).
- **Backend implementation** — this document defines flow and UI structure only.

---

This document is the **BeTalent video upload flow** design for product, design, and front-end implementation. Metadata fields align with CATEGORY-SYSTEM and DISCOVERY-AND-RANKING-ALGORITHM.
