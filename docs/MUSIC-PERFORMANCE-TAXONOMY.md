# BeTalent Music Performance Taxonomy

**Product architecture · Official classification system**  
*BeTalent is a music-first performance platform. This taxonomy is the single source of truth for genres, performance types, challenge classification, and creator style tags. It does not include non-music categories (e.g. comedy, acting, dance, special talent).*

---

## 1. Scope and use

This taxonomy is used across:

- **Upload flow** – Creator selects primary genre (required) and optional performance type and style tags.
- **Genre pages** – Browse and filter by primary genre; secondary type and style tags support refinement.
- **Creator profiles** – Display “main genre,” “performance types,” and “style tags” for discovery and matching.
- **Challenge logic** – Challenges are classified by type (artist, song, genre, technique, original); eligibility and ranking can filter by genre and tags.
- **Recommendation algorithm** – Same taxonomy ensures consistent signals for “similar performers,” “more like this,” and genre/theme discovery.

**Principles:**

- **Music and vocal performance only.** No categories for comedy, acting, dance, or other non-music talent.
- **Stable IDs.** Each term has a canonical **slug** (lowercase, hyphenated) for URLs, APIs, and DB.
- **Single selection where required.** Primary genre is one per performance/profile; secondary types and style tags can be multi-select where the product allows.

---

## 2. Layer 1: Primary Genre

Primary genre is the **main music style** of the performance or creator. It is required for uploads and is the primary axis for genre pages and discovery.

| Slug | Display name | Description |
|------|--------------|-------------|
| `pop` | Pop | Chart-oriented, melodic, mainstream vocal and production |
| `rnb` | R&B | Rhythm and blues; smooth, soul-influenced vocal and groove |
| `soul` | Soul | Emotion-driven, gospel-influenced, expressive vocal |
| `jazz` | Jazz | Improvisation, swing, standards, vocal jazz |
| `rock` | Rock | Electric, band-driven, power and edge |
| `rap-hiphop` | Rap / Hip-Hop | Rhythmic spoken word, flow, beats |
| `gospel` | Gospel | Faith-based, uplifting, choir and solo gospel vocal |
| `classical` | Classical | Opera, art song, classical crossover, trained vocal |
| `country` | Country | Storytelling, twang, Americana vocal and instrumentation |
| `latin` | Latin | Latin American styles: salsa, reggaeton, ballads, regional |
| `indie` | Indie | Independent, alternative pop/rock, non-mainstream |
| `alternative` | Alternative | Boundary-pushing, non-mainstream rock/pop |
| `afrobeat` | Afrobeat | African rhythms, fusion, contemporary African pop |
| `blues` | Blues | Blues vocal and phrasing, roots, emotion |
| `edm-dance` | EDM / Dance | Electronic, dance, club-oriented vocal and production |
| `folk` | Folk | Acoustic, narrative, traditional and contemporary folk |
| `reggae` | Reggae | Reggae, dancehall, Caribbean groove and message |

**Total: 17 primary genres.**

---

## 3. Layer 2: Secondary Performance Type

Performance type describes **how** the piece is delivered (e.g. cover vs original, instrument, production style). Optional at upload; can be multi-select where the product supports it.

| Slug | Display name | Description |
|------|--------------|-------------|
| `cover` | Cover | Performance of an existing published song |
| `original-song` | Original Song | Completely original composition and performance |
| `acoustic` | Acoustic | Acoustic instrumentation; unplugged or minimal production |
| `piano-version` | Piano Version | Piano-led arrangement (solo or with vocal) |
| `guitar-version` | Guitar Version | Guitar-led arrangement (solo or with vocal) |
| `live-session` | Live Session | Recorded as live take (no heavy post-production) |
| `acapella` | Acapella | Vocal only; no instrumental backing |
| `studio-style` | Studio Style | Produced, multi-track, studio-style recording |
| `medley` | Medley | Two or more songs or sections combined |
| `mashup` | Mashup | Two or more songs blended into one arrangement |
| `reimagined` | Reimagined | Substantially re-arranged or reinterpreted version of a song |

**Total: 11 performance types.**

---

## 4. Layer 3: Challenge Classification

Challenge classification defines **what kind of challenge** a given challenge is. Used for challenge creation, discovery (“Artist challenges,” “Original song challenges”), and eligibility rules.

| Slug | Display name | Description |
|------|--------------|-------------|
| `artist-challenge` | Artist Challenge | Perform a song by or inspired by a specific artist (e.g. Whitney Houston Week) |
| `song-challenge` | Song Challenge | Perform a specific song or from a short list |
| `genre-challenge` | Genre Challenge | Perform within a defined genre (e.g. Gospel Voices Week) |
| `technique-challenge` | Technique Challenge | Focus on a vocal or performance technique (e.g. belting, runs, acoustic) |
| `original-song-challenge` | Original Song Challenge | Submit original compositions only |
| `theme-challenge` | Theme Challenge | Theme-based (e.g. “Soul Voices Rising,” “Summer Anthems”) |
| `decade-challenge` | Decade Challenge | Songs or style from a specific decade |

**Total: 7 challenge classifications.**

---

## 5. Layer 4: Creator Style Tags

Style tags are **descriptive labels** for a creator’s vocal or performance character. Used for profile, discovery, and recommendation (“similar to,” “more like this”). Optional; multi-select.

| Slug | Display name | Description |
|------|--------------|-------------|
| `power-vocal` | Power Vocal | Strong, belting, high-energy delivery |
| `soft-vocal` | Soft Vocal | Gentle, intimate, breathy or subdued tone |
| `worship-voice` | Worship Voice | Suited to worship, gospel, or inspirational content |
| `melodic-rap` | Melodic Rap | Singing and rapping combined; melodic flow |
| `piano-vocal` | Piano Vocal | Performs regularly with piano (accompanying or featured) |
| `guitar-vocal` | Guitar Vocal | Performs regularly with guitar |
| `soulful-tone` | Soulful Tone | Soul-influenced, emotional, rich tone |
| `high-note-specialist` | High Note Specialist | Known for strong high register and runs |
| `storyteller` | Storyteller | Narrative, lyric-focused delivery |
| `belt` | Belt | Strong chest/mix belting style |
| `runs-riffs` | Runs & Riffs | Vocal runs, riffs, melisma |
| `acoustic-focused` | Acoustic-Focused | Primarily acoustic performances |
| `studio-producer` | Studio Producer | Strong focus on produced, multi-track work |
| `live-first` | Live-First | Emphasizes live, one-take performances |

**Total: 14 creator style tags.**

---

## 6. Taxonomy summary

| Layer | Purpose | Cardinality | Required in upload |
|-------|---------|-------------|--------------------|
| **Primary Genre** | Main music style | One per performance / profile default | Yes (one) |
| **Secondary Performance Type** | How the piece is delivered | Zero or more | No (optional) |
| **Challenge Classification** | Type of challenge | One per challenge | N/A (challenge config) |
| **Creator Style Tags** | Vocal/performance character | Zero or more | No (optional) |

---

## 7. Usage by product area

| Area | Primary genre | Performance type | Challenge classification | Style tags |
|------|----------------|------------------|---------------------------|------------|
| **Upload flow** | Required (single select) | Optional (multi) | N/A | Optional (multi) |
| **Genre pages** | Filter / segment | Optional filter | N/A | Optional filter |
| **Creator profile** | Default “main genre” | Shown if set | N/A | Shown if set |
| **Challenge logic** | Eligibility filter | Optional filter | Required (one per challenge) | Optional filter |
| **Recommendation** | Strong signal | Secondary signal | Context (e.g. “in this challenge”) | Strong signal for “similar” |

---

## 8. IDs and extensibility

- **Slugs** are canonical: use them in URLs (`/genres/pop`), APIs (`genre=pop`), and database (`genre_slug`, `performance_type_slug`, etc.).
- **Display names** are for UI only; slugs are stable for logic and i18n keys.
- New genres, performance types, challenge types, or style tags should be added with a new row (slug + display name + short description) and optional sort order; avoid reusing slugs or overloading meanings.
- Deprecated terms: keep slug in schema for legacy data; mark deprecated and hide from new upload/profile UI; still use in historical and analytics.

---

## 9. Non-goals (out of scope)

The following are **not** part of the BeTalent music performance taxonomy:

- Comedy, acting, dance, or “special talent” as primary categories.
- Broad “entertainment” or “variety” buckets that mix music with non-music.
- Instrument-only categories without vocal (unless the product later defines “instrumental” as a performance type under a genre).
- Duplicate or overlapping primary genres (e.g. “Pop” and “Pop/Rock” as two genres); use one primary genre plus style tags if needed.

This document is the **official BeTalent music performance taxonomy** for product, design, and engineering.
