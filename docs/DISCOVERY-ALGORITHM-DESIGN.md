# BeTalent Discovery Algorithm Design

**Product architecture · Recommendation system**  
*Structured design for what appears in For You, Trending, and Featured Performers. The algorithm must protect fairness: limit spam, detect bots, prevent fake engagement, and boost new creators fairly.*

---

## 1. Overview

The discovery system decides:

| Surface | Purpose |
|---------|---------|
| **For You feed** | Personalized feed of performance videos; primary discovery experience. |
| **Trending** | Content with strong current momentum; “what’s hot right now.” |
| **Featured Performers** | Curated creators for high-visibility slots (e.g. homepage). |

Each surface is driven by a **score** built from defined components. All surfaces share **fairness rules** (spam limits, bot detection, fake engagement prevention, fair new-creator boost). This document defines the score components, formulas, and fairness rules at a structural level.

---

## 2. For You feed: For You Score

The **For You** feed is ordered (and filtered) by a **For You Score** (or DiscoveryScore) computed per candidate **performance**. Higher score → higher position in the feed.

### 2.1 For You Score components

| Component | Description | Primary inputs |
|-----------|-------------|----------------|
| **WatchTimeScore** | How long viewers watch this performance | Average watch time %, total watch time (normalized by exposure). |
| **CompletionRate** | Share of viewers who watch to end (or high % of duration) | Completion rate; skip rate (inverse). |
| **EngagementScore** | Depth of interaction on this performance | Likes, comments, shares (normalized by view or impression). |
| **CreatorGrowthScore** | Creator’s recent trajectory | Follower growth rate, new supporters, week-over-week score delta. |
| **FreshnessScore** | Recency of the performance | Publish time; decay curve (e.g. boost in first 24–72h, then decay). |
| **ChallengeBoost** | Performance is part of current or recent challenge; viewer engages with challenges | Challenge tag; viewer’s challenge engagement; current “live” challenge boost. |
| **GenreRelevance** | Fit between performance genre and viewer preference | Viewer’s inferred genre affinity (from past watches, likes) vs performance’s primary genre. |

- All components are **normalized** (e.g. 0–100) within the relevant cohort or time window so that no single raw metric dominates.
- **GenreRelevance** and **ChallengeBoost** act as **personalization** (viewer-specific); the rest are **item-level** or **creator-level** signals.

### 2.2 For You Score formula (conceptual)

```
ForYouScore = WeightedSum(WatchTimeScore, CompletionRate, EngagementScore,
                          CreatorGrowthScore, FreshnessScore)
             × (1 + ChallengeBoost)
             × (1 + GenreRelevance)
             × FairnessGate
```

- **WeightedSum:** Linear combination of the five non-personalization components. Weights sum to 1.0; **no single component > 30%**.
- **ChallengeBoost** and **GenreRelevance:** Additive or multiplicative terms (e.g. 0–0.2 each) so that challenge and genre match increase score without dominating.
- **FairnessGate:** 0 or 1 (or confidence in [0,1]). If the item or creator fails fairness checks (spam, bot, fake engagement), score is zeroed or heavily dampened (see section 5).

### 2.3 Suggested weight ranges (WeightedSum)

| Component | Weight range | Rationale |
|-----------|--------------|-----------|
| WatchTimeScore | 22–28% | Core “did people actually watch?” |
| CompletionRate | 18–24% | Strong quality signal. |
| EngagementScore | 14–20% | Meaningful interaction per view. |
| CreatorGrowthScore | 10–16% | Rising creators get discovery. |
| FreshnessScore | 10–14% | Feed stays current. |

- Sum = 100%. ChallengeBoost and GenreRelevance are applied as **modifiers** after the sum, not as part of the 100%.

### 2.4 Behavior

- **Quality-first:** WatchTimeScore and CompletionRate have the largest weights so the feed favors performances that hold attention.
- **Discovery:** CreatorGrowthScore and FreshnessScore help new and rising creators and recent uploads appear.
- **Personalization:** GenreRelevance and ChallengeBoost tailor the feed to the viewer’s taste and competition interest.
- **Fairness:** FairnessGate ensures spam, bots, and fake engagement do not appear or are heavily down-ranked.

---

## 3. Trending: Trending Score

**Trending** surfaces content with **strong current momentum**. Each candidate receives a **Trending Score**; the list is ordered by this score (descending), subject to quality and fairness gates.

### 3.1 Trending Score components

| Component | Description | Primary inputs |
|-----------|-------------|----------------|
| **Recent view velocity** | Views (or impressions) in a short recent window; rate of change | Views in last 6–24h; views per hour; comparison to creator’s baseline. |
| **Recent engagement growth** | Likes, comments, shares in the short window; rate of change | Count and velocity of engagement in window; delta vs previous window. |
| **Gift activity** | Gifts and paid support in the short window | Gift count, coin value, supporter count in window (with anti-abuse caps). |
| **Challenge momentum** | Performance is in a live or recent challenge and gaining traction | Challenge status (live/results); votes or rank change in challenge in window. |

- All signals use a **short recent window** (e.g. last 6–12 hours). **Velocity** and **growth rate** matter more than absolute level.
- **Gift activity** is capped and filtered (e.g. velocity caps, exclude self-gifts) so that manipulation does not dominate.

### 3.2 Trending Score formula (conceptual)

```
TrendingScore = WeightedSum(recent view velocity, recent engagement growth,
                             gift activity, challenge momentum)
                × QualityGate
                × FairnessGate
```

- **WeightedSum:** Linear combination; weights sum to 1.0; **no single component > 35%**.
- **QualityGate:** 0 if WatchTimeScore or CompletionRate (for this item) is below a **minimum threshold** (e.g. top 50% in cohort); else 1 (or gradual). Prevents low-quality or skip-heavy content from trending.
- **FairnessGate:** 0 or 1 (or confidence). Items or creators that fail spam/bot/fake-engagement checks are excluded or zeroed (see section 5).

### 3.3 Suggested weight ranges (Trending)

| Component | Weight range | Rationale |
|-----------|--------------|-----------|
| Recent view velocity | 28–35% | Primary “it’s moving” signal. |
| Recent engagement growth | 25–32% | Audience is reacting. |
| Gift activity | 18–25% | Paid momentum (capped). |
| Challenge momentum | 15–22% | Tied to competition. |

- Sum = 100%.

### 3.4 Behavior

- **Current and exciting:** Short window and velocity-focused so Trending reflects “what’s hot right now.”
- **Quality maintained:** QualityGate ensures weak or skip-heavy content does not trend.
- **Fair:** FairnessGate and gift caps keep bots and fake engagement from dominating.

---

## 4. Featured Performers: Featured Performer Score

**Featured Performers** are **creators** (not individual videos) selected for high-visibility slots. Selection is driven by a **Featured Performer Score** computed per creator.

### 4.1 Featured Performer Score components

| Component | Description | Primary inputs |
|-----------|-------------|----------------|
| **Creator ranking** | Creator’s position on the platform’s creator ranking | CreatorScore (weekly or monthly); rank percentile or rank band (e.g. top 10%, top 20). |
| **Consistent high performance** | Sustained quality across recent performances | Mean WatchTimeScore or CompletionRate (or PerformanceScore) over last N performances (e.g. last 10 or last 30 days); variance (low variance = consistent). |
| **Strong audience support** | Meaningful support from fans | Gift count or value in last 7–30 days; supporter diversity; with velocity caps and abuse exclusion. |
| **Challenge success** | Current or recent challenge participation and placement | In current week’s challenge top 20; challenge finalist; challenge winner. |

- All components are **creator-level** and **normalized** (e.g. 0–100) within the eligible creator cohort.
- **Eligibility:** Only creators who pass **brand safety** (no active abuse flags, suitable for homepage) and a **minimum quality bar** (e.g. consistent high performance above cohort median) are eligible for Featured. Score is computed only for eligible creators.

### 4.2 Featured Performer Score formula (conceptual)

```
FeaturedPerformerScore = WeightedSum(creator ranking, consistent high performance,
                                     strong audience support, challenge success)
Eligibility: BrandSafe AND (consistent high performance >= min)
```

- **WeightedSum:** Linear combination; weights sum to 1.0; **no single component > 35%**.
- **Eligibility** is a **gate:** creators who do not meet brand safety or minimum performance are excluded from Featured regardless of score.

### 4.3 Suggested weight ranges (Featured Performers)

| Component | Weight range | Rationale |
|-----------|--------------|-----------|
| Creator ranking | 28–35% | Primary “platform rank” signal. |
| Consistent high performance | 25–32% | Talent and consistency. |
| Strong audience support | 18–25% | Fan commitment (capped). |
| Challenge success | 15–22% | Competition relevance. |

- Sum = 100%.

### 4.4 Behavior

- **Not random:** Only creators with strong ranking, consistent quality, support, and challenge success (and passing eligibility) can be featured.
- **Brand-safe:** Abuse and policy flags disqualify creators from Featured.

---

## 5. Fairness rules

The algorithm **must protect fairness**. The following rules apply across **For You**, **Trending**, and **Featured Performers**.

### 5.1 Limit spam

- **Spam:** High-frequency low-quality posting, duplicate or near-duplicate content, or content that violates platform rules (e.g. off-theme, placeholder).
- **Signals:** Posting velocity (performances per day), similarity to other content, report rate, moderation flags.
- **Action:** Content or creators with **spam indicators** receive a **low FairnessGate** (or **SpamConfidence** in [0,1]). When SpamConfidence is above a threshold (e.g. 0.7), **FairnessGate = 0** so the item or creator is **excluded** from For You, Trending, and Featured (or heavily down-ranked). Optionally, spam-flagged creators are removed from candidate pools entirely until reviewed.
- **Limit:** Rate limits or caps on how often the same creator or same content can appear in a short period (e.g. max N slots per creator in last 20 For You items for a given user).

### 5.2 Detect bot activity

- **Bots:** Views, likes, comments, or gifts from automated or fake accounts (e.g. no real user behind the account, or scripted behavior).
- **Signals:** Engagement from accounts that are new with no other activity; same device or IP clustering; instant or near-instant engagement from many accounts; patterns that fail human checks (e.g. CAPTCHA).
- **Action:** **Bot-attributed engagement** is **excluded** or **down-weighted** when computing WatchTimeScore, CompletionRate, EngagementScore, gift activity, and view velocity. So “1M views from bots” does not boost scores. Optionally, a **BotExclusionRate** (fraction of engagement deemed bot) is estimated per item or per creator; effective score = raw_score × (1 − BotExclusionRate) or equivalent.
- **Detection:** Use in-house heuristics (velocity, clustering, account age) and optionally third-party bot detection. Flag items or creators with high bot rate for review; apply FairnessGate so they do not surface in discovery until cleared.

### 5.3 Prevent fake engagement

- **Fake engagement:** Self-engagement (creator liking or gifting their own content via alt accounts), vote rings (groups of accounts boosting each other), or paid/incentivized engagement that violates policy.
- **Signals:** Same-account or linked-account engagement (e.g. creator account and alt); clusters of accounts that only engage with each other or with one creator; chargebacks or refunds on gift purchases that correlate with specific creators.
- **Action:** **Exclude** self-engagement and ring engagement from all score components (likes, comments, gifts, votes). **Velocity caps** (e.g. max gifts per user per creator per day) ensure no single account can dominate support metrics. **SuspiciousEngagementRatio** (fraction of engagement that is suspicious) can **dampen** effective EngagementScore or gift activity (e.g. effective = raw × (1 − ratio)). Creators with active **fake-engagement flags** fail the **FairnessGate** and are excluded (or heavily down-ranked) from For You, Trending, and Featured until resolved.

### 5.4 Boost new creators fairly

- **Goal:** New creators get **real discovery opportunity** without gaming the system or crowding out quality.
- **Definition of “new”:** Account age below threshold (e.g. 90 days) or performance count below threshold (e.g. 20) or follower count below threshold (product-defined).
- **Fair boost:**  
  - **For You:** New creators receive a **boost** (e.g. additive or multiplicative term) to For You Score **only if** their **WatchTimeScore** and **CompletionRate** are above a **minimum quality threshold** (e.g. top 60% in cohort). So only **quality** new creators are boosted; weak or spammy new content is not.  
  - **Trending:** No special “new creator” boost; Trending is purely velocity and quality. New creators can trend only if their content genuinely has momentum and passes quality and fairness gates.  
  - **Featured:** New creators can be featured only if they meet the same **eligibility** as everyone else (creator ranking in top band **or** strong rising trajectory, plus consistent high performance and brand safety). Optional: reserve a small number of Featured slots for “Rising” or “New Voice” creators who meet a slightly relaxed bar so that new talent is represented.
- **Cap:** The new-creator boost is **capped** so that a new creator cannot outrank clearly superior established content solely due to newness. Optionally, boost **decays** as the creator gains history (e.g. after 90 days or after 20 performances).

### 5.5 Fairness summary table

| Rule | Purpose | Action |
|------|---------|--------|
| **Limit spam** | Keep feed and trending free of spam | SpamConfidence → FairnessGate = 0 or down-rank; rate limits per creator. |
| **Detect bot activity** | Don’t reward bot views or engagement | Exclude or down-weight bot engagement in all score inputs; FairnessGate for high bot rate. |
| **Prevent fake engagement** | Don’t reward self-gifts, rings, fraud | Exclude self/ring engagement; velocity caps; SuspiciousEngagementRatio dampening; FairnessGate for flagged creators. |
| **Boost new creators fairly** | Give new talent real discovery | Quality-gated boost in For You only; no special Trending boost; Featured only if eligibility met; cap and optional decay. |

---

## 6. Output summary: score structures

### 6.1 For You Score

- **Components:** WatchTimeScore, CompletionRate, EngagementScore, CreatorGrowthScore, FreshnessScore, ChallengeBoost, GenreRelevance.
- **Formula:** WeightedSum (first five) × (1 + ChallengeBoost) × (1 + GenreRelevance) × FairnessGate.
- **Weights:** No single component > 30% in WeightedSum; quality (watch time, completion) has largest share.

### 6.2 Trending Score

- **Components:** Recent view velocity, recent engagement growth, gift activity, challenge momentum.
- **Formula:** WeightedSum × QualityGate × FairnessGate.
- **Weights:** No single component > 35%; velocity and engagement growth have largest share.

### 6.3 Featured Performer Score

- **Components:** Creator ranking, consistent high performance, strong audience support, challenge success.
- **Formula:** WeightedSum; eligibility gate (brand safe, minimum performance).
- **Weights:** No single component > 35%; creator ranking and consistent performance have largest share.

### 6.4 Fairness (all surfaces)

- **Limit spam:** SpamConfidence → exclude or down-rank.
- **Detect bot activity:** Exclude/down-weight bot engagement; FairnessGate for high bot rate.
- **Prevent fake engagement:** Exclude self/ring; velocity caps; dampen suspicious ratio; FairnessGate for flagged.
- **Boost new creators fairly:** Quality-gated boost in For You only; cap and optional decay; no special Trending boost; Featured only if eligible.

---

This document is the **structured BeTalent discovery algorithm design**. It defines what drives For You, Trending, and Featured Performers and how fairness is protected. Implementation (data pipelines, model training, thresholds) is out of scope. For full context on ranking, taxonomy, and discovery, see CREATOR-RANKING-SYSTEM, CATEGORY-SYSTEM, and DISCOVERY-AND-RANKING-ALGORITHM.
