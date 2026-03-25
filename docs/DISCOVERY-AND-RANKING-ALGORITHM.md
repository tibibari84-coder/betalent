# BeTalent Discovery and Ranking Algorithm

**Product architecture · Recommendation and feed strategy**  
*Algorithm design for For You feed, Trending, Featured Performers, and genre/challenge visibility. Balances real talent quality, discovery, fairness, engagement, competition prestige, and creator growth.*

---

## 1. Design principles

### 1.1 Platform identity

- **Premium music-first talent discovery.** The algorithm surfaces **vocal and music performance** that meets a quality bar. It is not a generic short-form feed; it serves “find great singers and performers” and “compete in challenges.”
- **Talent + discovery + fairness.** Quality (watch time, completion, performance signals) is primary. Discovery (new voices, diversity, freshness) is explicit. Fairness (anti-spam, anti-bot, dampening, quality thresholds) is non-negotiable.
- **Engagement and growth.** The system optimizes for **meaningful engagement** (watch, complete, react, support) and **creator growth** (new and rising creators get real exposure) without becoming a pure popularity contest.
- **Competition prestige.** Challenge participation, placement, and Live Battle outcomes carry weight in visibility so that “BeTalent competition” stays central to the product.

### 1.2 Alignment with existing systems

- **Creator Ranking System** (see `CREATOR-RANKING-SYSTEM.md`) defines **CreatorScore**, components (PerformanceScore, WatchQuality, EngagementScore, SupportScore, etc.), and label eligibility. The **discovery algorithm** consumes these scores and adds **feed-specific** logic (DiscoveryScore, TrendingScore, FeaturedPerformerScore).
- **Music Performance Taxonomy** (see `MUSIC-PERFORMANCE-TAXONOMY.md`) provides **genre**, **performance type**, and **style tags**. The algorithm uses them for **genre relevance**, **vocal style preference**, and **challenge relevance**.
- **Weekly Challenge System** and **Live Battles** define challenge and qualification context; the algorithm uses **challenge relevance** and **competition prestige** so that challenge-active content and creators get appropriate visibility.

---

## 2. For You feed: DiscoveryScore

The **For You** feed is the primary personalized discovery experience. Each candidate item (performance) receives a **DiscoveryScore** that determines ordering (and inclusion) in the feed for a given user (or anonymous session).

### 2.1 Purpose of the For You feed

- **Discover strong performers** — including new and mid-tier creators, not only the already-famous.
- **Promote high-quality singing** — watch quality and performance signals dominate over raw reach.
- **Avoid repetition** — diversity controls (creator, genre, recency) so the feed does not loop the same few creators or genres.
- **Avoid pure popularity contest** — normalization and caps prevent “who has the most followers” from fully dominating.

### 2.2 DiscoveryScore: input signals

All signals are **normalized** (e.g. 0–100 scale) within the relevant cohort or time window before combination. Normalization is percentile or band-based so that no single raw metric (e.g. view count) can overwhelm.

| Signal | Description | Primary inputs | Role in DiscoveryScore |
|--------|-------------|----------------|------------------------|
| **WatchTimeScore** | How long viewers watch this performance | Avg watch time %, completion rate, total watch time (normalized by exposure) | Core quality proxy; high weight. |
| **CompletionRate** | Share of viewers who watch to end (or to a high % of duration) | Completion rate, skip rate (inverse) | Strong “was it good?” signal; high weight. |
| **EngagementScore** | Depth of interaction | Likes, comments, shares, reply depth (normalized by impression or view) | Engagement per view, not raw count. |
| **CreatorGrowthScore** | Creator’s recent trajectory | Follower growth rate, new supporters, score delta (week-over-week) | Surfaces rising creators; moderate weight. |
| **FreshnessScore** | Recency of the performance | Publish time; decay curve (e.g. first 24–72 hours get a boost, then gradual decay) | Ensures feed feels current; avoids only old hits. |
| **PerformanceScore** | Quality of performance (from Creator Ranking) | Watch quality, completion, rewatch; same as Creator Ranking PerformanceScore | **Boost** when high: strong performances get extra visibility in For You. |
| **Genre relevance** | Fit between performance genre and viewer preference | Viewer’s inferred genre affinity (from past watches, likes, challenge participation) vs performance’s primary genre | Personalization; match increases score. |
| **Challenge relevance** | Performance is part of current or recent challenge; viewer cares about challenges | Challenge tag; viewer’s challenge engagement; current “live” challenge boost | Aligns feed with competition; challenge entries get visibility. |
| **New creator boost** | Opportunity for creators with limited history | Account age, performance count, follower count (inverse: newer/smaller get boost within quality band) | Discovery of new voices; applied only above minimum quality. |
| **Diversity control** | Avoid over-representation of one creator or genre | Same creator already shown in last N slots; same genre in last M slots; optional region/language | Down-rank or cap frequency so feed is varied. |
| **Anti-spam confidence** | Likelihood content or creator is legitimate | Spam/abuse signals, velocity anomalies, report rate, moderation flags | **Multiplier or gate:** low confidence reduces or zeroes score. |

### 2.3 DiscoveryScore: formula (conceptual)

```
DiscoveryScore = (WeightedSum of quality & engagement signals) × Personalization × Diversity × AntiSpamGate
```

- **WeightedSum:** Linear (or log-scaled) combination of WatchTimeScore, CompletionRate, EngagementScore, CreatorGrowthScore, FreshnessScore, PerformanceScore boost, with **no single signal > 25%** of the sum.
- **Personalization:** Genre relevance and challenge relevance act as **multipliers** or **additive terms** so that a performance that matches the viewer’s inferred taste gets a boost.
- **New creator boost:** Additive or multiplicative term for creators in the “new / small” band (e.g. account < 90 days or performance count < 20), **only if** WatchTimeScore and CompletionRate are above a **minimum quality threshold** (e.g. top 60% in cohort). Prevents boosting weak content.
- **Diversity control:** **Down-rank** or **exclude** if the same creator (or same genre) has already appeared in the last K (e.g. 5–10) items served to this viewer in this session (or last 24h). Can be implemented as a penalty term or as a filter before final sort.
- **Anti-spam confidence:** If confidence < threshold (e.g. 0.3), **DiscoveryScore = 0** or item is filtered out. Otherwise, confidence can act as a multiplier (e.g. score × confidence) so suspicious content is dampened.

### 2.4 Suggested weight ranges for For You (WeightedSum)

| Signal | Weight range | Rationale |
|-------|--------------|-----------|
| WatchTimeScore | 18–22% | Core “did people actually watch?” |
| CompletionRate | 15–20% | Strong quality signal. |
| EngagementScore | 10–14% | Meaningful interaction, normalized. |
| CreatorGrowthScore | 8–12% | Rising creators get discovery. |
| FreshnessScore | 10–14% | Feed stays current. |
| PerformanceScore (boost) | 12–18% | Talent quality from Creator Ranking. |
| (Genre and challenge relevance applied as personalization multipliers or separate terms; not as a single “relevance” weight that exceeds 25%.) |

- Sum of the above = 100% for the **base** score before personalization, diversity, and anti-spam.
- **New creator boost** is an **additive** or **multiplier** applied after base score, so it does not violate the “no single metric dominance” rule.

### 2.5 For You feed behavior summary

- **Strong new creators:** New creator boost + CreatorGrowthScore + quality threshold ensure that **high-quality** new performers get exposure.
- **High-quality singing:** WatchTimeScore, CompletionRate, and PerformanceScore dominate so the feed favors performances that hold attention.
- **Non-repetitive:** Diversity control (creator, genre) and FreshnessScore prevent the feed from being dominated by the same few creators or only old hits.
- **Not pure popularity:** Normalization by exposure (e.g. engagement per view, completion rate) and caps on “follower count” or “total views” as direct inputs keep the feed from being a simple “most views wins.”

---

## 3. Trending: TrendingScore

**Trending** surfaces content with **strong current momentum** while still meeting **quality and fairness** bars. It should feel **current and exciting** but not reward spam or low-quality viral spikes.

### 3.1 Purpose of Trending

- Show content that is **gaining traction right now** (velocity, not just total volume).
- Reflect **audience excitement** (reactions, support, challenge momentum).
- Maintain **quality filters** so Trending is not “whatever got the most bots or clicks.”

### 3.2 TrendingScore: input signals

All signals are computed over a **short recent window** (e.g. last 6–24 hours, or last 2–4 hours for “Trending now”). **Velocity** and **growth rate** matter more than absolute level.

| Signal | Description | Primary inputs | Role |
|--------|-------------|----------------|--------|
| **Recent view velocity** | Views (or impressions) in the short window; rate of change | Views in last 6–24h; views per hour; comparison to creator’s baseline | Core “something is happening” signal. |
| **Recent engagement growth** | Likes, comments, shares in the short window; rate of change | Count and velocity of engagement in window; delta vs previous window | Audience is reacting. |
| **Recent support / gift activity** | Gifts and paid support in the short window | Gift count, coin value, supporter count in window (with anti-abuse caps) | Paid engagement momentum. |
| **Challenge momentum** | Performance is in a live or recent challenge and gaining votes/views | Challenge status (live/results); votes or rank change in challenge in window | Competition-driven buzz. |
| **Strong audience reactions** | High reaction density (e.g. likes per view, comments per view) in window | Reaction rate normalized by views; Super Votes in window | Quality of engagement, not just volume. |
| **Creator momentum** | Creator’s overall trajectory in the window | Creator’s view/engagement growth across all their content in window; follower growth in window | Creator is having a moment. |

### 3.3 Quality and fairness filters for Trending

**Trending is not raw velocity.** Before an item is eligible for Trending (or before its TrendingScore is used):

- **Quality gate:** WatchTimeScore and CompletionRate (or PerformanceScore) must be above a **minimum threshold** (e.g. top 50% in cohort for the same window). Prevents “clickbait that people skip” from trending.
- **Anti-spam / anti-bot:** Anti-spam confidence must be above threshold; velocity that is anomalous (e.g. 100x creator baseline in 1 hour with no prior traction) can be **dampened** or **excluded** until verified.
- **Eligibility:** Content must meet platform rules (music performance, no policy violation, no active moderation flag). Optional: minimum account age or minimum performance count so that brand-new bot accounts cannot trend.

### 3.4 TrendingScore: formula (conceptual)

```
TrendingScore = VelocityWeightedSum × QualityMultiplier × AntiSpamGate
```

- **VelocityWeightedSum:** Combination of recent view velocity, engagement growth, support/gift activity, challenge momentum, audience reactions, creator momentum. **Velocity and growth rate** can be weighted more than absolute level (e.g. “views in last 6h / views in previous 6h” or “rank in challenge now vs 24h ago”).
- **QualityMultiplier:** 0 if below quality threshold; otherwise 0.5–1.0 based on WatchTimeScore / CompletionRate (or PerformanceScore) so that higher quality gets a boost.
- **AntiSpamGate:** 0 if confidence below threshold; else 1 (or confidence as multiplier).

### 3.5 Suggested weight ranges for Trending (VelocityWeightedSum)

| Signal | Weight range | Rationale |
|--------|--------------|-----------|
| Recent view velocity | 20–28% | Primary “it’s moving” signal. |
| Recent engagement growth | 18–24% | People are reacting. |
| Recent support / gift activity | 12–18% | Paid momentum (capped). |
| Challenge momentum | 12–18% | Tied to competition. |
| Strong audience reactions | 10–15% | Quality of engagement. |
| Creator momentum | 8–12% | Creator-level buzz. |

- No single signal > 28%.
- **Time window:** Same window for all (e.g. last 12 hours); can run multiple Trending lists (e.g. “Trending in last 6h” vs “Trending in last 24h”) with different windows.

### 3.6 Trending behavior summary

- **Current and exciting:** Short window + velocity/growth emphasis so Trending reflects “what’s hot right now.”
- **Quality maintained:** Quality gate and QualityMultiplier ensure weak or skip-heavy content does not trend.
- **Fair:** Anti-spam and velocity anomaly dampening keep bots and manipulation from dominating Trending.

---

## 4. Featured Performers: FeaturedPerformerScore

**Featured Performers** are creators selected for **high-visibility slots** (e.g. homepage hero, “Featured” strip). Selection is **not random**; it reflects quality, consistency, rising trajectory, challenge relevance, and brand safety.

### 4.1 Purpose of Featured Performers

- Surface creators who are **discovery-worthy** and **premium** for homepage exposure.
- Reflect **high quality**, **consistency**, and **current relevance** (e.g. rising, challenge-active).
- Be **brand-safe** and aligned with platform identity (music-first, talent, competition).

### 4.2 FeaturedPerformerScore: input signals

Inputs are **creator-level** (not per-performance). The score is used to **rank or filter** creators for Featured slots; the actual content shown (e.g. which performance) can be “best recent performance” or “best performance in current challenge” for that creator.

| Signal | Description | Primary inputs | Role |
|--------|-------------|----------------|--------|
| **Creator ranking** | Creator’s position in weekly/monthly Creator Ranking | CreatorScore (weekly or monthly); rank percentile | Core “how good is this creator?” from CREATOR-RANKING-SYSTEM. |
| **Performance average** | Average quality of creator’s recent performances | Mean PerformanceScore or WatchQuality over last N performances (e.g. last 10 or last 30 days) | Consistency of quality. |
| **Weekly challenge status** | Current or recent challenge participation and placement | In current week’s challenge top 20; recent challenge finalist; challenge winner | Competition relevance. |
| **Follower growth** | Recent audience growth | Follower growth rate (e.g. last 14–30 days); capped for spikes | Organic growth. |
| **Support / gift momentum** | Recent support from audience | Gift count or value in last 7–30 days; supporter diversity; with velocity caps | Fan commitment. |
| **Watch quality** | How well creator’s content is consumed | Avg watch time %, completion rate across recent performances | Talent signal. |
| **Recent standout performance** | At least one performance with very high WatchTimeScore or CompletionRate in last 7–14 days | Max PerformanceScore or CompletionRate in window | “They just dropped something great.” |
| **Rising flag** | Creator is in “Rising” list (from Creator Ranking) | Rising detection (score/rank delta) | Currently improving; discovery-worthy. |
| **Brand safety / trust** | No abuse flags; suitable for homepage | Abuse flags, report rate, moderation status; optional manual “featured eligible” flag | **Gate:** must pass to be featured. |

### 4.3 FeaturedPerformerScore: formula (conceptual)

```
FeaturedPerformerScore = WeightedSum(creator signals) × RisingBoost × StandoutBoost
Eligibility: BrandSafe AND (PerformanceAverage >= min) AND (CreatorRanking in top band OR Rising)
```

- **WeightedSum:** Combination of creator ranking (percentile or score), performance average, weekly challenge status, follower growth, support momentum, watch quality. Weights below.
- **RisingBoost:** Multiplier (e.g. 1.0–1.2) if creator is in Rising list; gives extra visibility to rising creators.
- **StandoutBoost:** Multiplier (e.g. 1.0–1.15) if creator has a recent standout performance; “they just had a moment.”
- **Eligibility:** Creator must pass **brand safety** (no active abuse, suitable for homepage). **Performance average** must be above minimum (e.g. top 50% in cohort). Creator must be in **top band** of weekly/monthly ranking (e.g. top 20%) **or** in **Rising** list. This ensures Featured is never “random” or low-quality.

### 4.4 Suggested weight ranges for Featured Performers

| Signal | Weight range | Rationale |
|--------|--------------|-----------|
| Creator ranking (weekly/monthly) | 22–28% | Primary “platform rank” signal. |
| Performance average | 18–24% | Consistency of quality. |
| Watch quality | 12–18% | Talent and hold. |
| Weekly challenge status | 10–16% | Competition relevance. |
| Support / gift momentum | 8–12% | Fan commitment (capped). |
| Follower growth | 6–10% | Organic growth (capped). |
| Recent standout | (as boost multiplier) | Bonus for “just dropped something great.” |
| Rising | (as boost multiplier) | Bonus for rising creators. |

- No single component > 28%.
- **Diversity (optional):** When **selecting** the final N Featured slots from the top of the FeaturedPerformerScore list, apply **diversity rules** (e.g. not more than 2 from same genre in top 4; optional region/language mix) so the homepage feels varied and discovery-oriented.

### 4.5 Featured Performers behavior summary

- **Not random:** Only creators who pass eligibility (quality, ranking or rising, brand safe) and score high on FeaturedPerformerScore are considered.
- **High quality + consistent:** Performance average and watch quality are heavily weighted.
- **Rising + challenge-relevant:** Rising boost and challenge status ensure discovery-worthy and competition-aligned creators appear.
- **Brand-safe:** Abuse and trust gates ensure Featured is premium and safe for homepage.

---

## 5. Genre-specific visibility

Content that appears on **genre pages** (e.g. “R&B,” “Gospel”) or in **genre-specific feeds** should be ranked by a combination of:

- **Genre match:** Performance’s primary genre (from Music Performance Taxonomy) equals (or is related to) the page genre.
- **Quality within genre:** For that genre, use **DiscoveryScore** or a **GenreScore** that is the same as DiscoveryScore but **filtered and normalized within that genre only**. So “Trending in R&B” = TrendingScore applied to performances with primary genre R&B, with same quality and anti-spam gates.
- **Challenge relevance:** If the current or recent challenge is genre-aligned (e.g. “Gospel Voices Week”), performances in that challenge can get a **visibility boost** on the Gospel genre page.
- **Freshness and diversity:** Same diversity and freshness logic as For You (e.g. don’t show the same creator in every slot; favor recent uploads within the genre).

**Ranking logic for genre pages:**

- **Primary:** DiscoveryScore (or GenreScore) computed **within genre cohort**; optional TrendingScore for “Trending in [Genre]” strip.
- **Secondary:** Challenge relevance boost when challenge theme matches genre.
- **Eligibility:** Primary genre = page genre; passes quality and anti-spam gates.

---

## 6. Challenge-specific visibility

Content that appears in **challenge contexts** (e.g. “Top entries for Whitney Houston Week,” “Trending in this challenge”):

- **Challenge leaderboard:** Defined in CREATOR-RANKING-SYSTEM and WEEKLY-CHALLENGE-SYSTEM (performance and votes within challenge). Leaderboard order = challenge ranking.
- **Discovery within challenge:** When showing “more entries” or “explore this challenge,” rank by **challenge-specific signals:** PerformanceScore and AudienceVotes (and optionally EngagementScore) **within that challenge’s entries only**, with freshness (e.g. recent submissions) and diversity (creator) so the same creator doesn’t dominate the list.
- **Challenge momentum in For You / Trending:** Already covered: **Challenge relevance** in DiscoveryScore and **Challenge momentum** in TrendingScore so that challenge-active content gets visibility in main feed and Trending.

**Summary:** Challenge-specific visibility is driven by **challenge ranking** for leaderboard and by **challenge-scoped quality + engagement + freshness** for discovery within the challenge; main feed and Trending use **challenge relevance** and **challenge momentum** as inputs.

---

## 7. Fairness rules

The system must **protect fairness** so that the algorithm cannot be gamed by spam, bots, or low-quality viral tricks, and so that weak or policy-violating content is suppressed.

### 7.1 Anti-spam detection

- **Signals:** Posting velocity (performances per day), comment/like velocity from same accounts, duplicate or near-duplicate content, report rate, flag rate from moderation.
- **Action:** Content or creator with spam indicators receives **reduced** DiscoveryScore and TrendingScore (e.g. AntiSpamConfidence < 1) or is **excluded** from For You and Trending until reviewed. Spam-flagged creators are **excluded** from Featured eligibility.
- **Confidence score:** An **AntiSpamConfidence** (or **TrustScore**) between 0 and 1 is computed per content and per creator; used as gate or multiplier in DiscoveryScore, TrendingScore, and FeaturedPerformerScore.

### 7.2 Bot resistance

- **Signals:** View or engagement from accounts that are new, have no or minimal other activity, or exhibit automated patterns (e.g. same IP, same device cluster, instant likes from many accounts). Optional: integration with third-party bot detection.
- **Action:** **Dampening:** Views or engagement attributed to likely bots are **excluded** or **down-weighted** when computing WatchTimeScore, CompletionRate, EngagementScore, view velocity, and gift/support metrics. So “1M views from bots” does not boost score.
- **Velocity anomaly:** Sudden spikes (e.g. 50x normal rate in 1 hour) with no prior organic traction can be **held** from Trending until validated or **dampened** in TrendingScore.

### 7.3 Suspicious engagement dampening

- **Self-engagement:** Same-account likes, gifts, or votes (creator’s own account or linked accounts) are **excluded** from all score computations.
- **Ring behavior:** Clusters of accounts that only engage with each other or with one creator are **flagged**; their engagement can be **down-weighted** or excluded.
- **Paid or incentivized manipulation:** Gifts or votes that correlate with known fraud (e.g. chargebacks, refunds, VPN farms) are **excluded** or down-weighted. Velocity caps (max gifts/votes per user per creator per day) as in Creator Ranking apply here too.
- **Dampening factor:** A **SuspiciousEngagementRatio** (share of engagement that is suspicious) can reduce the effective EngagementScore, SupportScore, or vote-based components (e.g. effective_score = raw × (1 - ratio) or similar).

### 7.4 Weak content suppression

- **Quality threshold:** Content below a **minimum** WatchTimeScore or CompletionRate (e.g. bottom 40% in cohort) is **not eligible** for For You or Trending, or receives a **strong down-rank** so it rarely appears. Threshold can be stricter for Featured (performance average must be top 50%).
- **Policy violation:** Content or creator with active moderation flag (e.g. copyright, community guidelines) is **excluded** from all discovery and ranking surfaces until resolved.
- **Duration and format:** Content that does not meet platform rules (e.g. too short, not music performance) is **filtered out** at ingestion so it never enters the ranking pipeline.

### 7.5 Quality threshold rules (summary)

| Surface | Minimum quality | Anti-spam / trust | Other |
|---------|------------------|-------------------|--------|
| **For You** | WatchTimeScore & CompletionRate above threshold (e.g. top 60%); optional PerformanceScore floor | AntiSpamConfidence above threshold; suspicious engagement dampened | Diversity and new creator boost only above quality. |
| **Trending** | WatchTimeScore & CompletionRate (or PerformanceScore) above threshold (e.g. top 50%) in velocity window | AntiSpamConfidence above threshold; velocity anomaly dampening | No policy violation. |
| **Featured** | Performance average above minimum (e.g. top 50%); creator in top band of ranking or Rising | Brand safe; no abuse flags | Eligibility gate. |
| **Genre / Challenge** | Same as For You within cohort; challenge ranking has its own rules | Same as above | Genre/challenge match required. |

---

## 8. Music-first rules

The algorithm must **respect music structure** and listener preferences so that discovery feels relevant and supports the music-first identity.

### 8.1 Genre preference

- **Inferred affinity:** From the viewer’s past behavior (watch, like, completion, follow) per **primary genre** (Music Performance Taxonomy). E.g. “viewer has high watch time and likes on R&B and Gospel.”
- **Use:** **Genre relevance** in DiscoveryScore: performances in genres the viewer prefers get a **boost** in For You. Genre pages use **genre match** and quality within genre.
- **Balance:** Genre relevance is a **personalization multiplier** or additive term, not > 25% of total score, so the feed does not become “only one genre.” Optional **exploration** term: small boost for genres the viewer has not watched much recently to encourage discovery.

### 8.2 Vocal style preference

- **Inferred affinity:** From past behavior on performances that have certain **performance types** or **style tags** (e.g. acoustic, power vocal, soulful tone). Stored per viewer (or anonymous session).
- **Use:** When scoring candidates, performances whose tags match the viewer’s inferred style preference get a **small boost** in DiscoveryScore. Optional “More like this” or “Similar performers” using style tags.
- **Weight:** Lower than genre (e.g. style as refinement within genre) so that music-first is preserved without over-narrowing.

### 8.3 Challenge participation

- **Viewer:** If the viewer has participated in challenges (voted, watched challenge entries, followed challenge), **challenge relevance** in DiscoveryScore is up-weighted for them (e.g. show more current challenge entries).
- **Creator:** Challenge participation and placement (ChallengeParticipationScore, challenge status) feed **FeaturedPerformerScore** and **challenge-specific visibility** so that challenge-active creators and entries get appropriate visibility.
- **Current challenge:** Performances that belong to the **current live challenge** can get a **recency and relevance boost** in For You and in challenge-specific surfaces.

### 8.4 Recurring listener interests

- **Stable preferences:** Long-term (e.g. 90-day) genre and style affinity so that “what this user tends to like” is stable and not only driven by last click.
- **Session and short-term:** Optional short-term context (e.g. “just watched Gospel”) to allow **temporary boost** for similar content in the same session, while still mixing in diversity and discovery.

### 8.5 Local vs global discovery mix

- **Global (default):** Discovery and Trending are **global** (all eligible content) so that the best talent surfaces regardless of region. Optionally, **region** or **language** can be a **soft** filter or diversity dimension (e.g. “ensure X% of For You has content from viewer’s region or language”) so that local talent gets some exposure.
- **Local discovery:** Optional “Trending in [Country]” or “Featured in [Region]” using the **same** TrendingScore and FeaturedPerformerScore but **filtered and re-ranked within region** (and with same quality and fairness rules). Ensures local creators can trend and be featured in their market.
- **Rule:** No surface is **only** local or **only** global by default; the mix is tunable (e.g. 80% global rank, 20% local boost or slot reserve).

---

## 9. New creator opportunity rules

The algorithm must **give strong new creators a real chance** to be discovered without boosting low-quality new content.

### 9.1 Definition of “new creator”

- **Band:** Account age below threshold (e.g. 90 days) **or** performance count below threshold (e.g. 20 performances) **or** follower count below threshold (e.g. 5,000). Product defines exact cutoffs.
- **Eligibility for boost:** New creator **and** (WatchTimeScore and CompletionRate above **minimum quality threshold**, e.g. top 60% in cohort for their content). So only **quality** new creators get the boost.

### 9.2 New creator boost in For You

- **Boost:** Additive or multiplicative term in DiscoveryScore (e.g. +10% or ×1.1) when the creator is in the “new” band and passes the quality gate.
- **Cap:** Boost is **capped** so that a new creator cannot outrank clearly superior established content by virtue of newness alone (e.g. boost applies only until score is “good enough” to appear in top N% of feed).
- **Sunset:** Boost **decays** as the creator gains history (e.g. after 30–90 days or after performance count exceeds threshold, boost phases out).

### 9.3 New creator in Trending and Featured

- **Trending:** New creators can trend **if** their velocity and quality pass the same gates as everyone else (no extra boost for new in Trending; quality and velocity only). Prevents “new account with one viral bot spike” from trending.
- **Featured:** New creators can be featured **only** if they are in **Rising** (strong improvement) and pass **performance average** and **brand safety** gates. “New Voice” label (from Creator Ranking) can be used to **prioritize** among otherwise tied candidates for a Featured slot (e.g. one “New Voice” in top 8 Featured).

### 9.4 Summary

- **For You:** New creator boost + quality gate + cap + sunset.
- **Trending:** No special new-creator boost; same velocity and quality rules.
- **Featured:** New creators eligible via Rising + quality + brand safety; optional slot for “New Voice.”

---

## 10. Competition prestige rules

The algorithm must **reflect and reinforce** the platform’s competition narrative (challenges, monthly/quarterly, Live Battles) so that competition prestige carries weight in visibility.

### 10.1 Challenge relevance in discovery

- **For You:** **Challenge relevance** is a signal in DiscoveryScore (performance is in current or recent challenge; viewer has challenge engagement). Entries in the **current live challenge** get a **boost** so that the weekly challenge is visible in the feed.
- **Trending:** **Challenge momentum** is a component of TrendingScore so that entries rising in a challenge leaderboard can trend.
- **Genre/challenge pages:** Challenge-themed content gets **extra visibility** on genre and challenge surfaces (see sections 5 and 6).

### 10.2 Ranking and qualification in Featured

- **Creator ranking:** FeaturedPerformerScore uses **Creator ranking** (weekly/monthly) and **weekly challenge status** (e.g. top 20 in current challenge, recent finalist). So creators who **compete and place well** are more likely to be featured.
- **Qualification history:** Optional: **QualificationHistory** (challenge wins, finalist badges, Live Battle participation) can be a **small component** of FeaturedPerformerScore (e.g. 5–10%) so that long-term competition prestige is recognized without dominating over current form.

### 10.3 Live Battle and premium events

- **Post-event visibility:** Creators who **won or placed** in a Live Battle (or monthly/quarterly finale) can receive a **temporary boost** in FeaturedPerformerScore or a **reserved slot** in Featured (e.g. “March Battle Winner” in the Featured strip for 7–14 days). Defined in LIVE-BATTLES-SYSTEM; algorithm consumes “battle winner / finalist” as a signal.
- **Prestige without lock-in:** Boost is **time-bound** so that past winners don’t permanently dominate; current quality and ranking still matter.

### 10.4 Summary

- **Discovery:** Challenge relevance and challenge momentum are explicit signals in For You and Trending.
- **Featured:** Ranking, challenge status, and optional qualification/battle outcome feed FeaturedPerformerScore and optional reserved slots.
- **No pure “winner takes all”:** Competition prestige is **one** set of signals among many; quality and fairness rules still apply.

---

## 11. Output: structured summary

### 11.1 Core scores

| Score | Purpose | Main inputs | Key gates |
|-------|---------|-------------|-----------|
| **DiscoveryScore** | For You feed ordering | WatchTimeScore, CompletionRate, EngagementScore, CreatorGrowthScore, FreshnessScore, PerformanceScore, genre/challenge relevance, new creator boost, diversity control, anti-spam confidence | Quality threshold; anti-spam gate; diversity penalty |
| **TrendingScore** | Trending list ordering | Recent view velocity, engagement growth, support/gift activity, challenge momentum, audience reactions, creator momentum | Quality gate; anti-spam gate; velocity anomaly dampening |
| **FeaturedPerformerScore** | Featured Performers selection | Creator ranking, performance average, watch quality, challenge status, support momentum, follower growth, recent standout, rising flag, brand safety | Brand safe; performance average min; top band or Rising |

### 11.2 Weighting logic (summary)

- **DiscoveryScore (For You):** Watch time and completion 33–42% combined; engagement 10–14%; creator growth 8–12%; freshness 10–14%; performance boost 12–18%. No single signal > 25%. Personalization (genre, challenge) and new creator boost applied as multipliers/additives. Diversity and anti-spam as gates/penalties.
- **TrendingScore:** View velocity 20–28%; engagement growth 18–24%; support/gifts 12–18%; challenge momentum 12–18%; audience reactions 10–15%; creator momentum 8–12%. Quality multiplier and anti-spam gate applied.
- **FeaturedPerformerScore:** Creator ranking 22–28%; performance average 18–24%; watch quality 12–18%; challenge status 10–16%; support 8–12%; follower growth 6–10%. Rising and standout as boosts. Eligibility: brand safe, performance min, top band or Rising.

### 11.3 Fairness rules (summary)

- **Anti-spam:** Confidence score; low confidence reduces or zeroes DiscoveryScore/TrendingScore; spam-flagged excluded from Featured.
- **Bot resistance:** Bot-attributed engagement excluded or down-weighted; velocity anomalies dampened in Trending.
- **Suspicious engagement:** Self-engagement excluded; ring and fraud engagement dampened; velocity caps on gifts/votes.
- **Weak content suppression:** Quality thresholds for For You, Trending, Featured; policy violations excluded.
- **Quality thresholds:** Per-surface minimums (WatchTime, Completion, Performance average) and trust gates.

### 11.4 New creator opportunity rules (summary)

- **Definition:** New = account age or performance count or follower count below threshold.
- **For You:** New creator boost applied only above quality threshold; cap and sunset as creator matures.
- **Trending:** No special new boost; same velocity and quality rules.
- **Featured:** New creators eligible via Rising + quality + brand safety; optional “New Voice” slot.

### 11.5 Competition prestige rules (summary)

- **Discovery:** Challenge relevance and challenge momentum in DiscoveryScore and TrendingScore; current challenge entries boosted in For You.
- **Featured:** Creator ranking, challenge status, optional qualification history and Live Battle outcome in FeaturedPerformerScore; optional time-bound “Battle Winner” slot.
- **Balance:** Prestige is one input among many; quality and fairness unchanged.

---

This document defines the **BeTalent discovery and ranking algorithm** for For You, Trending, Featured Performers, genre-specific and challenge-specific visibility, with explicit fairness, music-first, new creator, and competition prestige rules. Implementation (data pipelines, model training, A/B tests) is out of scope; this is the product and ranking strategy specification.
