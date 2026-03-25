# BeTalent Creator Ranking System

**Product architecture · Music-first talent platform**  
*Ranking framework that rewards talent and consistency. CreatorScore is built from PerformanceScore, EngagementScore, SupportScore, ConsistencyScore, ChallengeScore, and GrowthScore.*

---

## 1. Design principles

### 1.1 Talent and consistency

- **Talent first.** The system rewards **performance quality** (watch completion, retention, audio quality) so that strong singers and performers rise. Raw views or followers alone do not determine rank.
- **Consistency matters.** Upload frequency, recent activity, and sustained engagement are explicit components so that one viral clip does not outweigh steady, high-quality output.
- **Support as signal.** Gifts, coins, and Super Votes represent audience commitment and are weighted meaningfully—within guardrails (velocity caps, anti-manipulation) so they don’t dominate.
- **Challenge as prestige.** Challenge participation and placements feed the score and the **Challenge Champion** tier so competition stays central to the platform.

### 1.2 Fairness and integrity

- **No single metric dominance.** Weights are balanced so that no one component (e.g. gifts, likes) can by itself determine rank. Performance has the highest weight; no component exceeds the defined cap.
- **Velocity and anti-manipulation.** Spike detection, rate limits, and abuse flags (self-gifts, vote rings, bots) reduce or exclude suspicious engagement rather than inflate rank.
- **Transparent eligibility.** Creator ranks (New Voice, Rising Talent, Featured Performer, Top Ranked Artist, Challenge Champion) have defined eligibility rules so creators understand how they are evaluated.
- **Auditability.** Inputs and weights are documentable; scores can be recomputed for support and moderation.

---

## 2. CreatorScore: component definitions

Each component is a **0–100 normalized score** (or equivalent scale) within a cohort and time window. Raw metrics (views, likes, coins, etc.) are mapped to 0–100 via percentile or bands so they can be combined fairly.

### 2.1 PerformanceScore

**Purpose:** Reward content that holds attention and reflects vocal/performance quality.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Average watch completion** | Mean % of video watched (per view or per unique viewer) | Primary; high completion = high score. |
| **Audio quality signals** | Inferred or measured audio clarity, level, presence of vocal (where available) | Boost or penalty; optional at MVP. |
| **Audience retention** | Retention curve (e.g. % remaining at 25%, 50%, 75% of duration); rewatch rate | Primary; strong retention = high score. |

- **Normalization:** Within cohort (e.g. all creators with ≥1 performance in the window), map completion and retention to 0–100 (e.g. percentile or fixed bands).
- **Window:** Same as ranking window (weekly, monthly, or all-time); typically average over creator’s performances in the window.

### 2.2 EngagementScore

**Purpose:** Reward meaningful audience interaction beyond passive viewing.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Likes** | Like count on performances in the window | Normalized by exposure (e.g. likes per view or per impression) to reduce reach bias. |
| **Comments** | Comment count; optional: reply depth, sentiment | Same normalization; can weight comments slightly higher than likes as “deeper” engagement. |
| **Shares** | Share count (in-app or external) | Strong intent signal; include in composite engagement. |

- **Normalization:** Engagement per view or per impression (or percentile within cohort) so that large followings don’t automatically dominate.
- **Window:** Same as ranking window.

### 2.3 SupportScore

**Purpose:** Reward creators who build paying audience support (gifts, coins, Super Votes), within fairness limits.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Gifts** | Gift count; coins or value received from gifts | Primary; with velocity caps (e.g. max N coins per user per creator per day). |
| **Coins** | Total coins received (from gifts, tips, etc.) in the window | Can be combined with gift count or used as value-weighted signal. |
| **Super Votes** | Paid votes / boost actions directed at creator or their content | Premium signal; same velocity caps and anti-abuse as gifts. |

- **Normalization:** Percentile or bands within cohort; **supporter diversity** (number of unique supporters) can boost so that one big spender doesn’t outweigh many small supporters.
- **Anti-abuse:** Self-gifts, ring behavior, and abuse-flagged support are **excluded** or **down-weighted**; excess above velocity cap not counted.

### 2.4 ConsistencyScore

**Purpose:** Reward sustained output and recent activity so that consistent creators are ranked fairly.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Upload frequency** | Performances published per week or per month; regularity over the window | Higher, steady frequency = higher score; one-off spike = lower. |
| **Recent activity** | Activity in the last 7–30 days (uploads, engagement, or both) | Recency boost; inactive creators score lower in recent windows. |

- **Normalization:** Percentile within cohort (e.g. “upload frequency in last 30 days”) or banded (e.g. 0–1 uploads = low, 2–4 = medium, 5+ = high).
- **Window:** Typically 30 days for “recent activity”; can align with ranking window.

### 2.5 ChallengeScore

**Purpose:** Align rank with the platform’s competition narrative—participation and placements in challenges.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Challenge participation** | Number of challenges entered in the window; optional: theme fit, completion | More (valid) participation = higher score. |
| **Challenge placements** | Rank in each challenge (e.g. top 20, top 10, top 3, winner); weighted by placement | Better placement = higher score; winner > finalist > participant. |

- **Normalization:** Composite of “participations” and “placement points” (e.g. 100 for winner, 80 for top 3, 50 for top 10, 20 for top 20, 5 for entered) then mapped to 0–100 within cohort, or percentile of total challenge points in window.
- **Window:** Same as ranking window; all-time can use decayed challenge history.

### 2.6 GrowthScore

**Purpose:** Reward healthy audience growth and new audience discovery without rewarding artificial spikes.

| Signal | Description | Use in score |
|--------|-------------|--------------|
| **Follower growth** | Follower count delta in the window; growth rate (e.g. % or absolute) | Primary; can be capped or damped for extreme spikes. |
| **New audience discovery** | New followers, new supporters, or “first-time engagers” in the window | Distinguishes organic discovery from existing fan base. |

- **Normalization:** Percentile within cohort; **damped** for very high velocity (e.g. 10x normal growth in 24h) until validated so that bought or bot-driven spikes don’t dominate.
- **Window:** Same as ranking window (e.g. last 7 or 30 days).

---

## 3. CreatorScore: weighted formula

**CreatorScore** is the weighted sum of the six components. All components are on a 0–100 scale; CreatorScore is then 0–100 (or 0–1.0) and used to **order** creators (higher = better rank).

### 3.1 Standard weights

| Component | Weight | Rationale |
|-----------|--------|-----------|
| **PerformanceScore** | 0.30 (30%) | Highest weight; talent and watch quality are the core of the platform. |
| **EngagementScore** | 0.20 (20%) | Likes, comments, shares—meaningful interaction. |
| **SupportScore** | 0.20 (20%) | Gifts, coins, Super Votes—audience commitment; balanced so it doesn’t override talent. |
| **ChallengeScore** | 0.15 (15%) | Participation and placements—competition prestige. |
| **GrowthScore** | 0.10 (10%) | Follower growth and new discovery—momentum. |
| **ConsistencyScore** | 0.05 (5%) | Upload frequency and recent activity—sustained effort. |

**Formula:**

```
CreatorScore = (0.30 × PerformanceScore)
             + (0.20 × EngagementScore)
             + (0.20 × SupportScore)
             + (0.15 × ChallengeScore)
             + (0.10 × GrowthScore)
             + (0.05 × ConsistencyScore)
```

- **Sum of weights = 1.00 (100%).**
- **No single component > 30%** so the system cannot become a single-metric ranking. Performance is capped at 30%; Support and Engagement at 20%.

### 3.2 Time windows

- **Weekly ranking:** All six components computed over the **last 7 days** (or fixed week Mon–Sun). CreatorScore(weekly) = composite over 7-day window.
- **Monthly ranking:** All six components computed over the **last 30 days** (or calendar month). CreatorScore(monthly) = composite over 30-day window.
- **All-time ranking:** Components computed over **all time** with optional **decay** (e.g. exponential) so recent activity matters more than very old activity. CreatorScore(all-time) = composite with decay.

### 3.3 Cohort and normalization

- **Cohort:** e.g. “all creators with ≥1 qualifying performance in the window” (and not excluded by abuse). Normalization is **within this cohort** so scores are comparable.
- **Percentile or bands:** Each raw metric (or combination) is mapped to 0–100 per component so that scale differences (e.g. likes vs coins) don’t distort the weighted sum.

---

## 4. Ranking outputs

### 4.1 Weekly ranking

- **Window:** Last 7 days (or fixed week).
- **Output:** Ordered list of creators by **CreatorScore(weekly)** (descending).
- **Eligibility:** At least one qualifying performance in the window; no active abuse disqualification.
- **Use:** “Top creators this week,” weekly leaderboard, input to Rising detection and Featured eligibility.

### 4.2 Monthly ranking

- **Window:** Last 30 days or calendar month.
- **Output:** Ordered list by **CreatorScore(monthly)**.
- **Eligibility:** At least one qualifying performance in the month; optional minimum (e.g. 2+ performances) to avoid one-off spikes.
- **Use:** “Creator of the month,” monthly recap, Featured Performer eligibility, qualification for monthly events.

### 4.3 All-time ranking

- **Window:** All time with optional decay.
- **Output:** Ordered list by **CreatorScore(all-time)**.
- **Eligibility:** Any creator with at least one qualifying performance ever; abuse can remove from public ranking.
- **Use:** “Hall of fame,” Top Ranked Artist eligibility, long-term credibility.

### 4.4 Challenge ranking (per challenge)

- **Scope:** One challenge (e.g. “Whitney Houston Week”).
- **Inputs:** For **that challenge’s entries only**: performance metrics (completion, retention), engagement (likes, votes), and optionally support within the challenge. **Not** the full CreatorScore; challenge leaderboard is **challenge-scoped** so new voices can win.
- **Output:** Ordered list of **entries** (or creators by best entry) for that challenge.
- **Use:** Challenge leaderboard, Challenge Champion / finalist / winner labels, qualification for Live Battles or next round.

---

## 5. Creator ranks (labels / tiers)

Creator ranks are **labels or tiers** derived from CreatorScore, challenge outcomes, and eligibility rules. They are descriptive, not a separate score. A creator can hold multiple labels (e.g. Rising Talent + Challenge Finalist).

### 5.1 New Voice

- **Meaning:** New to the platform with early potential.
- **Eligibility:** First performance within last 14–30 days (product-defined); optional: high PerformanceScore or EngagementScore on first few pieces so that only **quality** new creators get the label.
- **Use:** Discovery (“New Voices” row), algorithm boost for discovery; not yet eligible for Featured or Top Ranked until consistency threshold is met.

### 5.2 Rising Talent

- **Meaning:** Strong positive trajectory (improving quickly).
- **Eligibility:** In the **Rising** set: e.g. top 20% by **CreatorScore delta** (week-over-week or month-over-month) or “moved up ≥N positions” in weekly/monthly rank. Minimum activity in both periods (e.g. 1+ performance in each) so it’s not gamed by one upload after long silence.
- **Use:** “Rising this week” strip, Featured pool, discovery.

### 5.3 Featured Performer

- **Meaning:** Editorial / product feature—high quality, consistent, discovery-worthy, brand-safe.
- **Eligibility:**  
  - **CreatorScore** in top band (e.g. top 20% weekly or monthly).  
  - **PerformanceScore** (or watch completion) above minimum (e.g. top 40% in cohort).  
  - **ConsistencyScore** above threshold (e.g. 2+ performances in last 30 days or top 50% consistency).  
  - No active abuse flags; activity in last 30–90 days.  
  - Drawn from top of weekly/monthly ranking and Rising list **after** these filters.
- **Use:** Homepage featured strip, “Featured Performer” badge, discovery.

### 5.4 Top Ranked Artist

- **Meaning:** Top of the leaderboard.
- **Eligibility:** Top N (e.g. 10 or 20) in **weekly**, **monthly**, or **all-time** ranking (product chooses which to show—e.g. “Top 10 this week,” “Top 20 all-time”). Must meet same integrity/abuse rules as Featured.
- **Use:** Leaderboard display, “Top Ranked Artist” badge, prestige.

### 5.5 Challenge Champion

- **Meaning:** Won a challenge (or reached the top competitive tier in a challenge).
- **Eligibility:** **Rank 1** in a specific challenge’s leaderboard (and rule-compliant). Optionally: “Challenge Champion” reserved for **winner**; “Challenge Finalist” for top 5 or top 10 in that challenge.
- **Use:** Badge (“Challenge Champion – Whitney Houston Week”), qualification for Live Battles, monthly/quarterly progression, prestige.
- **Persistence:** Label can be **persistent** (e.g. “Challenge Champion – Gospel Voices Week”) or time-bound; same creator can be Champion in multiple challenges.

### 5.6 Rank summary table

| Rank | Meaning | Primary eligibility |
|------|---------|---------------------|
| **New Voice** | New, early potential | First performance in last 14–30 days; optional quality bar. |
| **Rising Talent** | Strong upward trajectory | Top improvers by CreatorScore delta or rank move; min activity. |
| **Featured Performer** | Editorial feature | Top CreatorScore + quality + consistency + no abuse + recency. |
| **Top Ranked Artist** | Top of leaderboard | Top N in weekly/monthly/all-time ranking. |
| **Challenge Champion** | Won a challenge | Rank 1 in a challenge (rule-compliant). |

---

## 6. Fairness and anti-gaming

### 6.1 Velocity caps

- **Support (gifts, coins, Super Votes):** Max N coins (or N gifts) from a **single user** to a **single creator** per day (or per week). Excess not counted or down-weighted.
- **Engagement:** Optional cap or dampening on likes/comments from same IP or same account cluster to limit ring behavior.

### 6.2 Abuse and trust

- **Self-gifts / self-votes:** Excluded from SupportScore and any vote-based metrics.
- **Vote rings / bot engagement:** Flagged engagement excluded or down-weighted; creators with active abuse flags **excluded** from public ranking and Featured/Top Ranked eligibility until resolved.
- **Spike dampening:** GrowthScore and SupportScore can be damped when velocity is anomalous (e.g. 10x normal in 24h) until validated.

### 6.3 New and small creators

- **New Voice** gives visibility without requiring long history.
- **Rising Talent** is based on **improvement**, not absolute rank, so mid-tier and new creators can earn the label.
- **Challenge ranking** is **per challenge** (performance and votes in that challenge only) so new entrants can become Challenge Champion without prior all-time rank.

---

## 7. Full ranking system structure (summary)

### 7.1 Score components (inputs)

| Component | Primary signals | Normalization |
|-----------|-----------------|---------------|
| **PerformanceScore** | Average watch completion, audio quality signals, audience retention | 0–100 within cohort |
| **EngagementScore** | Likes, comments, shares (normalized by exposure) | 0–100 within cohort |
| **SupportScore** | Gifts, coins, Super Votes (velocity-capped, abuse-excluded) | 0–100 within cohort |
| **ConsistencyScore** | Upload frequency, recent activity | 0–100 within cohort |
| **ChallengeScore** | Challenge participation, challenge placements | 0–100 within cohort |
| **GrowthScore** | Follower growth, new audience discovery (damped for spikes) | 0–100 within cohort |

### 7.2 CreatorScore formula

```
CreatorScore = 0.30 × PerformanceScore
             + 0.20 × EngagementScore
             + 0.20 × SupportScore
             + 0.15 × ChallengeScore
             + 0.10 × GrowthScore
             + 0.05 × ConsistencyScore
```

- Used for **weekly**, **monthly**, and **all-time** leaderboards by changing the time window (and optional decay for all-time).

### 7.3 Ranking outputs

| Output | Window | Use |
|--------|--------|-----|
| Weekly ranking | 7 days | Weekly leaderboard, Rising, Featured pool |
| Monthly ranking | 30 days | Monthly leaderboard, Featured, qualifications |
| All-time ranking | All time (optional decay) | Hall of fame, Top Ranked Artist |
| Challenge ranking | Per challenge | Challenge leaderboard, Challenge Champion / finalist |

### 7.4 Creator ranks (labels)

| Rank | Eligibility |
|------|-------------|
| New Voice | First performance in window; optional quality bar |
| Rising Talent | Top improvers (score/rank delta); min activity |
| Featured Performer | Top CreatorScore + quality + consistency + integrity + recency |
| Top Ranked Artist | Top N in weekly/monthly/all-time |
| Challenge Champion | Rank 1 in a challenge (rule-compliant) |

### 7.5 Fairness rules

- Velocity caps on support and optional engagement.
- Abuse-flagged engagement excluded; abusive creators excluded from public ranking and featured.
- Spike dampening on Growth and Support.
- Challenge leaderboard scoped to challenge only so new voices can win.

---

This document is the **BeTalent Creator Ranking System**: structure and logic for CreatorScore, components, weights, ranking outputs, and creator ranks. Implementation (data pipelines, storage, APIs) is out of scope here.
