# For You: Half-Life Decay & Anti-Filter-Bubble

## 1. Half-Life Decay

### How It Works

Similar to Reddit / Hacker News: **every 24 hours, freshness influence is halved.**

```
decay = 0.5 ^ (ageHours / HALFLIFE_HOURS)
```

- **ageHours**: time since video upload
- **HALFLIFE_HOURS**: 24 (tunable)

### Counterbalance

Strong engagement can **counterbalance decay**:

```
counterbalance = retention × 0.4 + support × 0.35 + engagement × 0.25
effectiveMultiplier = decay + (1 - decay) × min(1, counterbalance)
```

- **retention**: completion rate, watch time quality
- **support**: gifts, votes
- **engagement**: likes, comments, shares

When retention + support + engagement are high, the video stays competitive even when old.

### Tunable Constants

| Constant | Default | Description |
|----------|---------|-------------|
| `FOR_YOU_HALFLIFE_HOURS` | 24 | Hours after which freshness influence halves |
| `FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS` | retention 0.4, support 0.35, engagement 0.25 | How much each signal counterbalances decay |

### Outcomes

- **Old content** does not dominate forever
- **New high-quality content** has a fair chance to surface
- **Viral evergreen** (high retention + support) can still rank well

---

## 2. Personalization Without Filter Bubble

### 80/20 Split

| Bucket | Share | Purpose |
|--------|-------|---------|
| **Personalized** | 80% | Relevance, user interests |
| **Exploration** | 20% | Discovery, novelty |

### Personalized Bucket (80%)

Sources:
- **ranking** (65%): proven performances, high retention/support
- **styleMatch** (35%): videos matching user's preferred categories/styles

### Exploration Bucket (20%)

Intentional discovery sources (not random):

| Source | Share | Content |
|--------|-------|---------|
| **rising** | 30% | Rising creators (≤3 uploads) |
| **fresh** | 30% | New uploads (last 48h) |
| **challenge** | 25% | Active challenge content |
| **other** | 15% | Adjacent categories (not in user's preferred set) |

### Tunable Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FOR_YOU_PERSONALIZED_SHARE` | 0.8 | Share of feed from personalized |
| `FOR_YOU_EXPLORATION_SHARE` | 0.2 | Share of feed from exploration |
| `FOR_YOU_PERSONALIZED_MIX` | ranking 0.65, styleMatch 0.35 | Within personalized |
| `FOR_YOU_EXPLORATION_MIX` | rising 0.3, fresh 0.3, challenge 0.25, other 0.15 | Within exploration |

---

## 3. How Personalization Avoids Overfitting

1. **Explicit 20% exploration**: Every feed always includes discovery content from rising, fresh, challenge, other.

2. **Exploration is intentional**: Not random shuffle, but structured sources (rising creators, new uploads, challenge content, adjacent categories).

3. **Category affinity is soft**: User preferences boost but do not filter; exploration still surfaces non-preferred categories.

4. **Half-life decay**: Old personalized favorites naturally decay over time; new content gets a fair chance.

5. **Creator diversity**: Max 2 videos per creator; no back-to-back same creator.

---

## 4. Feed Shaping Flow

```
1. Fill personalized slots (80%):
   - Round-robin from ranking + styleMatch
   - Diversity: creator cap, no back-to-back

2. Fill exploration slots (20%):
   - Round-robin from rising + fresh + challenge + other
   - Same diversity rules

3. If slots remain: fill from any remaining candidates
```
