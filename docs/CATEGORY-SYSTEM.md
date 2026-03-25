# BeTalent Category System

**Product architecture · Three-level taxonomy**  
*Music-first performance platform. All categories revolve around music performance. No comedy, acting, magic, or special talent.*

---

## 1. Scope and principles

### 1.1 Music-first only

- BeTalent is a **music-first performance platform** focused on **singing and musical talent**.
- The category system **does not include** and must not expose:
  - Comedy  
  - Acting  
  - Magic  
  - Special Talent  
  - Any non-music talent as primary categories.
- Every level of the taxonomy describes **music performance**: style of music (genre), format of performance (type), or vocal/performance character (style tags).

### 1.2 Three-level model

| Level | Name | Purpose | Selection at upload |
|-------|------|--------|---------------------|
| **Level 1** | Primary Genre | Main music style of the performance | **Required** — one selection |
| **Level 2** | Performance Type | How the piece is delivered (cover, original, instrument, production) | **Required** — one selection |
| **Level 3** | Style Tags | Vocal/performance character (power, soft, soul, etc.) | **Optional** — zero or more |

### 1.3 Identifiers

- **Slug:** Canonical machine ID for each term (lowercase, hyphenated). Used in storage, APIs, URLs, and algorithm inputs.
- **Display name:** Shown in UI; slugs are stable for logic and i18n.

---

## 2. Level 1 — Primary Genre

**Definition:** The main music style of the performance. One per performance; required at upload.

| Slug | Display name |
|------|--------------|
| `pop` | Pop |
| `rnb` | R&B |
| `soul` | Soul |
| `jazz` | Jazz |
| `rock` | Rock |
| `rap-hiphop` | Rap / Hip-Hop |
| `gospel` | Gospel |
| `classical` | Classical |
| `country` | Country |
| `latin` | Latin |
| `indie` | Indie |
| `alternative` | Alternative |
| `afrobeat` | Afrobeat |
| `blues` | Blues |
| `edm` | EDM |
| `folk` | Folk |
| `reggae` | Reggae |

**Total: 17 primary genres.**

---

## 3. Level 2 — Performance Type

**Definition:** How the performance is delivered (cover vs original, instrument, production context). One per performance; required at upload.

| Slug | Display name |
|------|--------------|
| `cover` | Cover |
| `original-song` | Original Song |
| `acoustic-version` | Acoustic Version |
| `piano-version` | Piano Version |
| `guitar-version` | Guitar Version |
| `studio-style` | Studio Style |
| `live-session` | Live Session |
| `acapella` | Acapella |

**Total: 8 performance types.**

---

## 4. Level 3 — Style Tags

**Definition:** Descriptive labels for vocal or performance character. Zero or more per performance; optional at upload.

| Slug | Display name |
|------|--------------|
| `power-vocal` | Power Vocal |
| `soft-vocal` | Soft Vocal |
| `soul-voice` | Soul Voice |
| `worship-voice` | Worship Voice |
| `melodic-rap` | Melodic Rap |
| `high-note-specialist` | High Note Specialist |
| `emotional-performance` | Emotional Performance |
| `storytelling-voice` | Storytelling Voice |

**Total: 8 style tags.**

---

## 5. Upload rules

When a creator uploads a performance:

| Field | Requirement | Cardinality |
|-------|-------------|-------------|
| **Primary Genre** | Required | Exactly one (from Level 1) |
| **Performance Type** | Required | Exactly one (from Level 2) |
| **Style Tags** | Optional | Zero or more (from Level 3) |

- The system **must store** for each performance:
  - `primary_genre_slug` (or equivalent)
  - `performance_type_slug` (or equivalent)
  - `style_tag_slugs` (array or relation; can be empty).
- Validation: only values from the defined taxonomy are valid. Unknown or deprecated slugs are rejected.

---

## 6. Storage model (logical)

Attributes to persist per performance (and optionally aggregated per creator):

| Attribute | Type | Example |
|-----------|------|--------|
| Primary genre | Single slug (FK or enum) | `soul` |
| Performance type | Single slug (FK or enum) | `acoustic-version` |
| Style tags | Set/list of slugs | `["power-vocal", "emotional-performance"]` |

- Use **slugs** in storage and APIs; resolve to display names in UI.
- Creator profile may store **default** or **most used** primary genre and performance types for pre-fill and discovery; per-performance values remain the source of truth for that performance.

---

## 7. Downstream use

The stored attributes are consumed by:

| Consumer | Primary genre | Performance type | Style tags |
|----------|----------------|-------------------|------------|
| **For You algorithm** | Genre relevance; personalization; diversity | Secondary signal; “more like this” | Similarity and preference signals |
| **Genre pages** | Primary filter and segment (e.g. /genres/soul) | Optional filter | Optional filter |
| **Challenges** | Eligibility (e.g. genre challenges); challenge discovery | Eligibility (e.g. original-only, acoustic-only) | Optional theme or filter |
| **Creator ranking** | Cohort and normalization (e.g. rank within genre) | Context for performance quality | Optional boost or filter |
| **Trending sections** | “Trending in [Genre]”; genre-specific trending | Optional breakdown (e.g. “Trending Acoustic”) | Optional refinement |

- **Genre pages:** Filter and rank performances (and creators) by primary genre; optional filters for performance type and style tags.
- **Challenges:** Challenge rules can require or prefer certain genres, performance types, or style tags; stored attributes are used for eligibility and leaderboards.
- **For You / Trending / Ranking:** Use primary genre, performance type, and style tags as inputs to DiscoveryScore, TrendingScore, FeaturedPerformerScore, and CreatorScore (see DISCOVERY-AND-RANKING-ALGORITHM.md and CREATOR-RANKING-SYSTEM.md).

---

## 8. Taxonomy summary

| Level | Name | Count | Required at upload |
|-------|------|-------|--------------------|
| 1 | Primary Genre | 17 | Yes (one) |
| 2 | Performance Type | 8 | Yes (one) |
| 3 | Style Tags | 8 | No (zero or more) |

- **Slugs** are the single source of truth for storage, APIs, URLs, and algorithms.
- **Display names** are for UI only; add descriptions in a separate table or copy if needed for tooltips and help.
- **Extensibility:** New terms = new slug + display name; deprecate by hiding from upload UI and retaining in data for history and analytics.

This document is the **official BeTalent category system** (three-level taxonomy) for product, design, and engineering.
