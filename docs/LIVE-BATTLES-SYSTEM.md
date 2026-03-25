# BeTalent Live Battles

**Product architecture · Premium event system**  
*Curated, event-based live face-offs where selected creators compete in real time. Live Battles are rare, premium, and tied to challenge, ranking, and qualification—not open streaming.*

---

## 1. Design principles

- **Curated, not open.** Live Battles are **invitation- or qualification-based**. They are not available to every user at all times. Only selected creators participate as performers.
- **Premium and event-based.** Each battle is a **scheduled event** with a defined theme, bracket or matchup, and start/end time. It feels like a show, not a random live stream.
- **Tied to competition.** Every Live Battle is linked to a **challenge**, **ranking period**, or **qualification stage** (weekly, monthly, quarterly). Participation and outcomes feed the platform’s competition narrative and Creator Ranking System.
- **Audience as spectators and participants.** The audience **watches live**, can **support with gifts**, and may **participate through controlled voting**—within clear rules so the event stays fair and prestigious.
- **Platform identity.** Live Battles reinforce BeTalent as a **music-first competition platform** where the best voices earn a spotlight in high-stakes, live moments.

---

## 2. What Live Battles are

### 2.1 Definition

A **Live Battle** is a **scheduled, real-time competitive event** in which:

- A **fixed set of creators** (e.g. 2 in a head-to-head, or 4–8 in a bracket) perform **live** in turn, within a single session.
- The event is **tied to** a challenge (e.g. “Whitney Houston Week Finale”), a ranking period (e.g. “Monthly Top 8 Showdown”), or a qualification stage (e.g. “Quarterly Semi-Final Battle”).
- The **audience** watches the same stream, can send **gifts** during the event, and may **vote** (when enabled) under controlled rules.
- A **winner** (or final ranking) is determined by a defined mix of live performance, audience votes, and/or judge input—and is **reflected in** challenge results, ranking, or qualification (e.g. advancement to next round, badge, leaderboard impact).

### 2.2 What Live Battles are not

- **Not** open live streaming for all users. Only invited or qualified creators go live in a Battle.
- **Not** unmoderated “go live anytime” rooms. Every Battle has a defined time, roster, and format.
- **Not** disconnected from competition. Battles are always anchored to a challenge, ranking, or qualification.
- **Not** frequent. They are **rare, high-signal events** that feel special when they occur.

### 2.3 Event structure (conceptual)

| Element | Description |
|---------|-------------|
| **Event** | One Live Battle instance (e.g. “March Monthly Finale – Gospel Voices”). |
| **Anchor** | The challenge, ranking period, or qualification stage this Battle serves. |
| **Roster** | The set of creators who will perform. Standard format: **Creator vs Creator** (two creators per battle). |
| **Format** | **Creator vs Creator.** Two creators face off in a single battle. Optional: multiple such matchups in one event (e.g. semi-final then final). |
| **Schedule** | Published start time, approximate duration, timezone. **Cadence:** once per week or once per month (product decision). |
| **Outcome** | Winner (or rank order); **audience support (gifts, votes) affects final ranking**; outcome feeds badges, ranking, qualification. |

### 2.4 Battle format: rounds and duration

- **Rounds:** Each battle has **3 rounds**.
- **Duration per round:** **60 seconds** per round (creator performance time).
- **Total battle time:** 3 × 60 seconds of performance time, plus transitions, voting windows, and host/commentary as needed (e.g. ~15–25 minutes per matchup including breaks).
- **Audience support affects final ranking:** Gifts and votes during (or after) rounds are combined into the battle outcome so the winner reflects both performance and audience support, within defined weights and caps.

### 2.5 Event structure summary

| Dimension | Design |
|-----------|--------|
| **Access** | Premium; not open to everyone. Only qualified creators participate. |
| **Qualification** | Top 10 weekly challenge, Top ranked creators, Special invitations. |
| **Format** | Creator vs Creator (two creators per battle). |
| **Duration** | 3 rounds; 60 seconds per round (performance time). |
| **Audience** | Watch live; send gifts; vote. Audience support affects final ranking. |
| **Cadence** | Once per week or once per month (product decision). |

---

## 3. Who qualifies for Live Battles

Qualification is **strict and transparent**. Only creators who meet defined criteria can be **invited or auto-qualified** to participate in a given Battle.

### 3.1 Qualification paths (three paths)

Only creators who qualify via one of the following paths may participate. Live Battles are **not open to everyone**.

| Path | How it works |
|------|--------------|
| **Top 10 weekly challenge** | Creators who place in the **top 10** of a weekly challenge (e.g. Whitney Houston Week, Gospel Voices) are eligible for the Live Battle tied to that challenge (or for the next weekly/monthly battle pool). Rank 1–10 in that challenge’s leaderboard qualifies. |
| **Top ranked creators** | Creators in the **top ranked** band on the platform’s creator ranking (weekly or monthly CreatorScore leaderboard, e.g. top 10 or top 20) are eligible for Live Battle slots tied to that period (e.g. “Monthly Top Ranked Battle”). |
| **Special invitations** | The platform may extend **special invitations** to a limited number of creators (e.g. guest artists, comeback, diversity of voices). Invited creators fill reserved slots and do not displace qualifiers from the other two paths. |

- A creator can qualify via more than one path but still occupies **one slot** per event.
- **Selection when slots are limited:** Within each path, rank order applies (e.g. challenge rank 1–10, leaderboard rank 1–N). If there are more qualifiers than slots, highest rank gets the slot; tie-break by challenge vote share or submission time.

### 3.2 Eligibility rules (in addition to qualification)

- **Account in good standing:** No active suspension or ban; no recent serious violations.
- **Technical readiness:** Ability to join the live event (device, connection, compliance with technical requirements—defined at implementation time).
- **Commitment:** Creator accepts the Battle slot (e.g. RSVP or confirm within a deadline); no-show policy applies (e.g. forfeit, replacement from next in rank).
- **One slot per event:** A creator may only occupy one performer slot per Live Battle instance.

### 3.3 Selection when slots are limited

If more creators qualify than there are slots (e.g. 12 monthly qualified, 8 Battle slots):

- **Primary:** Rank order from the anchor (e.g. challenge leaderboard, monthly leaderboard). Top N get slots.
- **Tie-break:** Defined rule (e.g. higher audience vote share in anchor challenge, then earlier submission time).
- **Invitation reserve:** If the product uses invited slots, those are filled separately and do not displace top qualifiers.

---

## 4. When Live Battles happen

### 4.1 Cadence: once per week or once per month

- **Not daily.** Live Battles are **scheduled events** that occur at a **defined cadence**. The product chooses one of:
  - **Once per week:** One Live Battle per week (e.g. weekend after the weekly challenge results). Qualifiers: e.g. top 10 from that week’s challenge + optional top ranked + special invitations. Keeps competition rhythm tight.
  - **Once per month:** One Live Battle per month (e.g. first weekend of the month). Qualifiers: e.g. top 10 from selected weekly challenges in the month, top ranked creators for the month, special invitations. Fewer, higher-stakes events.
- **No overlap:** Only one Live Battle at a time so the platform and audience focus on a single event.
- **Publish cadence in advance:** The schedule (e.g. “Every Saturday 8pm” or “First Sunday of each month”) is published so creators and audience can plan.

### 4.2 Timing

- **Published in advance:** Event name, anchor, date, time (and timezone), and roster (or “top N from [challenge/period]”) are published so audience and creators can plan.
- **Duration:** Bounded (e.g. 60–90 minutes per event) so the experience is contained and premium.
- **No overlap (MVP):** Only one Live Battle at a time so the platform and audience focus on a single event.

### 4.3 Relation to challenge and ranking calendar

- **Challenge finale:** Battle occurs **after** the linked challenge’s **Results** are published (e.g. Sunday results → “Challenge Live Finale” the following weekend).
- **Monthly finale:** Battle occurs **after** monthly leaderboard and qualified list are published (e.g. first weekend of the next month).
- **Quarterly finale:** Battles occur **after** quarterly qualified list is published (e.g. semi-final in week 2 of the new quarter, final in week 4).

---

## 5. How Live Battles fit into weekly / monthly / quarterly competition

### 5.1 Weekly

- **Optional “Challenge Live Finale.”** The week’s main challenge (e.g. “Gospel Voices Week”) has a **Results** phase with a leaderboard. The **top 2 or top 4** from that challenge are eligible for a **Live Battle** that serves as the challenge’s “finale.”
- **Outcome:** Winner of the Live Battle can receive a **Challenge Finale Winner** badge or bonus weight in that challenge’s historical record; runner-up can get **Finalist** recognition. This does not replace the main challenge leaderboard (which is already in Results) but adds a **live, head-to-head** layer on top.
- **Placement:** Clearly positioned as “the live finale for [Challenge Name],” so weekly challenge → results → (optional) live finale.

### 5.2 Monthly

- **“Monthly Showdown” or “Monthly Finale.”** Creators on the **monthly qualified** list (from Weekly Challenge System) are eligible. A fixed number (e.g. 8) are selected by rank; they compete in a **single Live Battle event** (bracket or showcase format).
- **Outcome:** Winner and top 3 (or top 4) get **Monthly Battle Winner / Finalist** recognition; outcome can feed **quarterly qualification** (e.g. monthly battle winner auto-qualifies for quarterly) and Creator Ranking (e.g. QualificationHistory, ChallengeParticipationScore).
- **Placement:** Clearly positioned as the **monthly capstone** event for that month’s competition.

### 5.3 Quarterly

- **“Quarterly Semi-Final” and “Quarterly Final.”** **Quarterly qualified** creators compete in a **semi-final** Live Battle (e.g. 8 or 16); top N advance to the **Quarterly Final** Live Battle.
- **Outcome:** **Quarterly Final** winner (and optionally top 3) receive the highest-tier battle recognition (e.g. “Q1 Live Battle Champion”); outcomes feed all-time or quarterly leaderboard and “Top Ranked” narrative.
- **Placement:** The **premium** moment of the quarter—rare, high-stakes, and central to platform identity.

### 5.4 Summary

| Level | Battle type | Who participates | Outcome feeds |
|-------|-------------|------------------|---------------|
| **Weekly** | Challenge Live Finale (optional) | Top 2 or 4 from that week’s challenge | Challenge finale badge; optional ranking boost |
| **Monthly** | Monthly Showdown / Finale | Monthly qualified (e.g. top 8) | Monthly battle winner/finalist; quarterly qualification; ranking |
| **Quarterly** | Semi-Final + Final | Quarterly qualified; top N from semi advance to final | Quarterly champion; all-time/quarterly leaderboard; platform prestige |

---

## 6. Audience interaction rules

The audience is central to the event: they **watch live**, **send gifts**, and **vote**. **Audience support affects the final ranking** (see section 7 and 8).

### 6.1 Who is the audience

- **Any logged-in user** (or optionally any viewer, with reduced interaction for anonymous) can **watch** the live stream.
- **Interaction** (gifts, voting) may require **logged-in** and optionally **verified** or **minimum account age** to reduce abuse.

### 6.2 What the audience can do

| Action | Allowed? | Notes |
|--------|----------|--------|
| **Watch live** | Yes | Primary experience; single shared event stream. Audience watches the same battle (Creator vs Creator, 3 rounds). |
| **Send gifts** | Yes | Gifts are attributed to **specific creators** (Creator A vs Creator B). Rate limits and caps apply. **Gift support affects final ranking** (combined with votes; see outcome logic). |
| **Vote** | Yes | Voting is enabled per round or at battle end; one vote per user per round (or per battle). **Votes affect final ranking.** Controlled windows so the result is fair and auditable. |
| **Chat** | Optional | If enabled: moderated; no spam, no hate. |
| **Share / invite** | Yes | Share event link. |

### 6.3 What the audience cannot do

- **Cannot** join as a performer. Only pre-selected creators perform.
- **Cannot** vote outside the defined voting window or more than the allowed votes per user per round.
- **Cannot** use gifts or votes to manipulate in violation of anti-abuse rules (e.g. self-gifting, vote rings).

---

## 7. Gift support during Live Battles

### 7.1 Purpose

- Gifts during a Live Battle let the audience **support creators in real time** and express preference. They can be **counted as part of** the battle outcome (e.g. “support score”) and/or **monetization** (creator and platform revenue).
- Gifts must be **fair** (e.g. caps, no single user dominating) and **aligned** with the platform’s ranking philosophy (support as signal, not sole determinant).

### 7.2 Design choices

| Aspect | Recommendation |
|--------|----------------|
| **Recipient** | Gifts are attributed to **specific performers** in the Battle (e.g. Creator A vs Creator B: gifts to A or B). Optionally a small share can go to “the event” (platform or prize pool). |
| **Visibility** | Gift animations or totals can be shown on the live stream (e.g. “Support for [Creator]: X”) to drive excitement without obligating outcome to gift count alone. |
| **Weight in outcome** | Gifts can be **one component** of the battle result (e.g. “Support Score” = normalized gift value per creator), combined with **votes** and/or **judge score**, so outcome is not “who got the most gifts” only. Suggested: gifts ≤ 30–40% of total outcome weight in any formula. |
| **Caps and limits** | Per-user cap per creator per battle (e.g. max coin value per user per performer); velocity limits to prevent last-second dumping. Excess can be ignored or down-weighted. |
| **Anti-abuse** | Self-gifting (creator gifting to themselves via alt) and obvious rings are prohibited; detection and disqualification or zero-weight for that support. |

### 7.3 MVP

- **MVP:** Gifts **enabled** during the event; attributed to performers; **visible** (e.g. running total or animations). Outcome can be **vote-only** in MVP, with gifts **not** affecting the official result—only revenue and engagement. This simplifies fairness validation. **Full version:** Gifts become a defined component of the battle outcome with caps and weight.

---

## 8. Voting during Live Battles

### 8.1 Purpose

- **Controlled voting** lets the audience influence the battle result in a **transparent, auditable** way. It should feel fair and meaningful, not easily gamed.

### 8.2 Design choices

| Aspect | Recommendation |
|--------|----------------|
| **When** | Voting opens only during **defined windows** (e.g. after each performance round, or only in the “final round” after all performances). Not open for the entire stream. |
| **How many votes** | **One vote per user per round** (or per battle), or a **limited allocation** (e.g. 3 votes per user for the whole battle, can split or give all to one). Prevents one account from dominating. |
| **Eligibility** | Logged-in user; optional minimum account age or activity to reduce fake accounts. |
| **Visibility** | Vote counts or percentages can be shown **after** the voting window closes (or after the battle) to avoid bandwagon effect; or shown live depending on product choice. |
| **Weight in outcome** | Audience vote can be **one component** (e.g. 40–50%) with judge score and/or support (gifts) making up the rest, so the result is mixed and prestigious. |
| **Anti-abuse** | Same as Creator Ranking: vote rings, multiple accounts, automation → detection and disqualification or zero-weight. |

### 8.3 Formats (examples)

- **Head-to-head (2 creators):** One vote per user after both have performed; majority wins the round.
- **Showcase (4–8 creators):** Each user gets 1 vote (or N votes) after all performances; creator with most votes wins (or top 2 advance).
- **Bracket:** Vote per matchup (A vs B, then C vs D); winners advance; vote again for next round. One vote per user per matchup.

### 8.4 MVP

- **MVP:** **Single voting window** at the end of the battle (e.g. “Vote for the winner” after all performances). **One vote per user.** Outcome = **vote winner** (or vote + optional judge override for tie/fairness). **Full version:** Per-round voting, optional Super Votes, and mixed outcome (votes + gifts + judge) with published weights.

---

## 9. Moderation and quality control

### 9.1 Before the event

- **Creator eligibility:** Confirm qualified creators meet eligibility (standing, technical, commitment). Replace or forfeit if no-show.
- **Content and theme:** Performers are briefed on theme, duration per turn, and conduct. No prohibited content (same as platform rules for performances).
- **Technical check:** Optional brief tech rehearsal or minimum requirements so the live stream is stable.

### 9.2 During the event

- **Live moderation:** Trained moderator(s) monitor the stream and chat (if chat is on). Remove violating comments; mute or remove bad-faith participants if needed.
- **Performance compliance:** If a performance clearly violates theme or rules (e.g. wrong genre, lip-sync), the platform can **disqualify** that performance or that creator from the round/battle per policy (preferably with pre-published rules).
- **Stability:** Defined runbook for technical failure (e.g. creator drop, stream down): pause, reconnect, or postpone with clear communication to audience.

### 9.3 After the event

- **Result audit:** Outcome (votes, gifts, judge scores if any) is **auditable** and stored. Dispute or appeal process for creators (e.g. within 24–48 hours) with clear criteria.
- **Abuse review:** Post-event review for vote or gift manipulation; if found, result can be adjusted or winner changed and bad actors sanctioned.
- **Recognition and ranking:** Winner and finalists are **officially** recorded; badges and ranking impact are applied per design (qualification, Creator Ranking System).

### 9.4 Quality bar

- **Performance quality:** Same bar as platform (live vocal/performance, no lip-sync, theme fit). Violations are handled per moderation policy.
- **Stream quality:** Minimum technical standards (resolution, latency) so the event feels premium; defined at implementation.

---

## 10. MVP vs full version

### 10.1 MVP (first ship)

| Dimension | MVP |
|-----------|-----|
| **Cadence** | **One** Live Battle per month (or per quarter). No weekly challenge finale yet. |
| **Qualification** | **Monthly qualified** creators only (from Weekly Challenge System); e.g. top 8 by rank. No invitation reserve. |
| **Format** | **Single event:** 4 or 8 creators; each performs once; **one voting window** at the end. **One vote per user.** Winner = vote winner. |
| **Gifts** | **Enabled** during event; attributed to performers; **not** part of official outcome (revenue and engagement only). Caps and anti-abuse still apply. |
| **Voting** | **Vote-only** outcome; one vote per user; single window after all performances. |
| **Audience** | Watch + vote + send gifts. No chat, or very limited. |
| **Anchoring** | Battle is explicitly tied to “Monthly Showdown for [Month]” and monthly qualified list. |
| **Moderation** | Basic: eligibility check, live mod for chat (if any), post-event result storage. No judge panel. |
| **Outcome** | Winner and top 3 get badges/recognition; outcome feeds quarterly qualification (e.g. winner auto-qualifies) and ranking. |

**MVP goal:** Validate that curated, event-based Live Battles work: audience shows up, creators engage, outcome is clear and fair, and the event feels premium.

### 10.2 Full version (later)

| Dimension | Full version |
|-----------|--------------|
| **Cadence** | Weekly (optional challenge finale) + monthly + quarterly (semi + final). |
| **Qualification** | Challenge top N, monthly qualified, quarterly qualified, plus optional **invited** slots. |
| **Format** | Head-to-head, bracket, and showcase; **per-round** voting; multiple rounds per event. |
| **Gifts** | **Part of outcome:** Support Score with caps and weight (e.g. 30%) alongside votes and judge. |
| **Voting** | Per-round or per-matchup; optional **Super Votes** (paid); **mixed outcome** (votes + gifts + judge) with published weights. |
| **Audience** | Watch, vote, gifts, **chat** (moderated), share, optional rewards for participation. |
| **Anchoring** | Every Battle linked to a named challenge, ranking period, or qualification stage; clear narrative. |
| **Moderation** | Full: tech check, live mod, performance compliance, post-event audit, appeal process, abuse review. **Judge panel** for selected events (e.g. quarterly final). |
| **Outcome** | Winner, finalists, full ranking; feeds challenge finale badge, monthly/quarterly leaderboard, qualification, and “Top Ranked” narrative. |

### 10.3 Phasing (suggested)

1. **Phase 1 (MVP):** Monthly Live Battle only; vote-only outcome; gifts for engagement; no chat or simple chat; outcome → badges + quarterly qualification.
2. **Phase 2:** Add **quarterly** Live Battles (semi + final); optional **judge** component; gifts as part of outcome with caps.
3. **Phase 3:** Add **weekly** Challenge Live Finale (top 2 or 4 per challenge); per-round voting; optional Super Votes; full moderation and appeal.

---

## 11. Summary

- **Live Battles** are **curated, scheduled, real-time events** where **selected creators** compete. They are **not** open streaming.
- **Qualification** comes from **challenge results**, **monthly/quarterly qualified** lists, **ranking**, or (full version) **invitation**. Eligibility and selection rules are strict and transparent.
- **When:** Tied to competition calendar—weekly (optional), monthly, quarterly—with **rare, premium** cadence.
- **Fit:** Battles are the **live capstone** for a challenge (finale), month (showdown), or quarter (semi/final); outcomes **feed** badges, qualification, and Creator Ranking.
- **Audience:** **Watch** live; **gift** (with caps and optional outcome weight); **vote** in controlled windows with one vote per user (MVP); no performing.
- **Gifts:** Allowed and attributed to performers; MVP = engagement/revenue only; full = component of outcome with weight and caps.
- **Voting:** Controlled (when, how many, eligibility); MVP = single window, one vote per user, vote-only winner; full = per-round, optional Super Votes, mixed outcome.
- **Moderation:** Eligibility, live mod, performance compliance, post-event audit and abuse review; full version adds judge panel and appeal.
- **MVP:** One monthly Battle, monthly qualified, vote-only outcome, gifts for engagement. **Full:** Weekly + monthly + quarterly, mixed outcome (votes + gifts + judge), brackets, chat, full moderation.

This document defines the **BeTalent Live Battles** product and event structure. Streaming technology and implementation are out of scope here.
