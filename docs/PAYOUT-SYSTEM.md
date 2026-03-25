# BeTalent Creator Payout System

**Product architecture · Fintech**  
*Creators earn from gifts (70% of coin value). Earnings convert to cash at a defined rate; creators withdraw when balance meets the minimum via Stripe, PayPal, or bank transfer. This document defines the payout workflow and financial safeguards—no implementation.*

---

## 1. Design principles

- **Creator earnings are real money.** Gifts generate creator share (70% in coins); coins convert to USD (or local currency) at a transparent rate. Withdrawals move real funds to the creator’s chosen method.
- **Safe and compliant.** Identity verification, fraud detection, and suspicious-activity monitoring protect creators and the platform. Payouts are gated on verification and risk checks.
- **Auditable.** Every earnings credit, conversion, and payout is traceable so that balances and payouts can be reconciled and disputed if needed.
- **Aligned with gift system.** Earnings source = creator share from gift transactions (see GIFT-AND-COIN-SYSTEM). Conversion rate and minimum payout are configurable.

---

## 2. Earnings and balance

### 2.1 Source of creator earnings

- When a user sends a **gift** to a creator, the creator receives **70% of the gift’s coin value** (platform keeps 30%). That amount is **creator share in coins** (e.g. 70 coins for a 100-coin gift).
- Each gift transaction is recorded with **gift sender**, **gift receiver**, **gift value**, **creator_share_coins**, and **platform_share_coins** (see GIFT-AND-COIN-SYSTEM).
- **Creator earnings balance (coins)** = sum of all **creator_share_coins** from gift transactions where receiver = that creator, minus any amounts already **converted to payout** or **reversed** (e.g. refund, chargeback, or adjustment).

### 2.2 Coin-to-cash conversion

- **Conversion rule (example):** **100 coins = 1 USD** (i.e. 1 coin = $0.01 USD).
- **Creator cash from one gift:** creator_share_coins ÷ 100 = USD (e.g. 70 coins → $0.70 USD).
- **Earnings balance in USD:** creator_earnings_coins ÷ 100 = **available balance (USD)** for payout. The system can store balance either as **coins** and convert at display/payout time, or as **USD** updated at each gift using the same rate. For payouts, the **withdrawable amount** is in **USD** (or local currency); conversion rate is applied consistently (at gift time or at payout time—product decision; see 2.3).
- **Rate governance:** The rate (e.g. 100 coins = 1 USD) is **configurable** and **versioned** (or effective from a date) so that historical earnings and new earnings can use the correct rate. Rate changes apply only to **future** gift earnings unless otherwise defined.

### 2.3 Creator payout balance (USD)

- **Available balance (USD)** = creator earnings in coins (from gifts, 70% share) converted to USD at the current (or applicable) rate, minus:
  - Amounts already paid out (withdrawals),
  - Amounts on **hold** (e.g. pending verification, dispute, or reserve),
  - Any **reversals** (chargebacks, refunds, fraud adjustments).
- Creators see **available balance** in the app (e.g. “$127.50 available to withdraw”). They can request a **withdrawal** only up to **available balance** and only if balance ≥ **minimum payout**.

---

## 3. Minimum payout and withdrawal eligibility

### 3.1 Minimum payout threshold

- **Example minimum payout:** **50 USD**. Creators can **request a withdrawal** only when their **available balance (USD)** is at least the minimum (e.g. ≥ $50).
- The minimum is **configurable** (e.g. $50, $25, or $100 by region or product). It reduces per-payout processing cost and ensures withdrawals are meaningful.
- **UI:** “Withdraw” is enabled when balance ≥ minimum; otherwise “You need $X more to reach the $50 minimum” (or similar).

### 3.2 Withdrawal eligibility (gates)

Before a creator can withdraw, the following **gates** must be satisfied (product can enforce all or a subset at launch):

| Gate | Purpose |
|------|---------|
| **Available balance ≥ minimum** | e.g. ≥ $50 USD. |
| **Identity verification** | Creator has completed identity verification (see section 6). |
| **Account in good standing** | No suspension, no active fraud or policy violation. |
| **Payout method on file** | At least one payout method (Stripe, PayPal, or bank) added and verified. |
| **No active hold** | Balance (or portion) not held for dispute, review, or reserve. |

- If any gate fails, the creator sees a clear message (e.g. “Complete identity verification to withdraw”) and the withdraw action is blocked until resolved.

---

## 4. Withdrawal methods

Creators can withdraw earnings via the following **payout methods**. The platform supports one or more; exact availability may depend on region and partner support.

| Method | Description | Typical use |
|--------|-------------|-------------|
| **Stripe payout** | Payout to a bank account or card linked via Stripe (e.g. Stripe Connect, Express accounts). Funds are transferred to the creator’s connected bank. | Default for many regions; fast (e.g. 2–7 days). |
| **PayPal** | Payout to the creator’s **PayPal account** (email). Platform sends funds via PayPal Payouts or Mass Pay. | Familiar for creators; good where Stripe is limited. |
| **Bank transfer** | Direct transfer to a **bank account** (IBAN, account number + routing, etc.). Can be implemented via Stripe, a banking partner, or a payout provider. | Preferred in some regions; may have higher minimum or slower settlement. |

- **Creator flow:** Creator adds a **payout method** (e.g. connect Stripe, link PayPal email, add bank details). The system **validates** the method where possible (e.g. micro-deposit for bank, PayPal email confirmation). Only **verified** methods can be used for withdrawal.
- **Per withdrawal:** Creator selects **amount** (≤ available balance, ≥ minimum) and **payout method**; system processes (see section 5).

---

## 5. Payout workflow

### 5.1 End-to-end flow

| Step | Actor | Action |
|------|--------|--------|
| 1. Request | Creator | Initiates withdrawal: selects amount (USD) and payout method. Amount must be ≥ minimum (e.g. $50) and ≤ available balance. |
| 2. Validation | System | Checks eligibility: balance, minimum, identity verified, account standing, payout method valid. If any check fails, reject with clear reason. |
| 3. Risk check | System | Runs fraud and suspicious-activity checks (see section 7). If risk is high, route to **manual review** or **hold** instead of auto-approve. |
| 4. Reserve | System | **Reserves** the withdrawal amount from available balance (so the same funds cannot be requested again). Payout record status = **pending**. |
| 5. Processing | System | Sends payout instruction to the chosen **payout provider** (Stripe, PayPal, or bank transfer). Provider returns acknowledgment or failure. |
| 6. Completion | System | On success: mark payout as **completed**; record transaction for creator (debit earnings, credit payout). On failure: **release reserve**, return balance to creator, notify creator (e.g. “Payout failed; check your account details”). |
| 7. Creator notification | System | Notify creator (in-app and/or email): “Your payout of $X has been sent” or “Payout failed: [reason].” |

### 5.2 Payout states

| State | Meaning |
|-------|---------|
| **Pending** | Withdrawal requested; amount reserved; awaiting provider processing or manual review. |
| **Processing** | Sent to provider; awaiting confirmation. |
| **Completed** | Funds sent successfully; creator’s balance debited; payout closed. |
| **Failed** | Provider or system failure; reserve released; balance restored; creator notified. |
| **On hold** | Paused for review (fraud, compliance, or dispute); reserve held until resolved. |
| **Cancelled** | Withdrawal cancelled (e.g. by creator or support); reserve released. |

### 5.3 Timing and limits (optional)

- **Processing time:** Stripe and PayPal often complete within days (e.g. 2–7 business days to bank). Bank transfer may be slower. Display “Expected by [date]” when possible.
- **Velocity limits:** Optional cap (e.g. max 1 payout per day, or max $X per week) to limit exposure and fraud; document in safeguards.
- **Maximum per payout:** Optional cap (e.g. max $5,000 per withdrawal) for risk control; large payouts may require manual review.

---

## 6. Security requirements: identity verification

### 6.1 Purpose

- **Identity verification** ensures the payout recipient is the legitimate account holder and meets platform and regulatory expectations (e.g. KYC for moving money). It reduces fraud and chargeback risk.

### 6.2 When required

- Verification is **required before first withdrawal** (or before any withdrawal if the product so decides). Creator cannot withdraw until verification is **approved**.
- Optional: require verification when **cumulative earnings** exceed a threshold (e.g. $500) even if no withdrawal yet.

### 6.3 What verification includes (conceptual)

| Element | Description |
|---------|-------------|
| **Identity document** | Government-issued ID (e.g. passport, driver’s license). Creator uploads image; system or vendor checks authenticity and match to name/DOB. |
| **Name and date of birth** | Match to ID and to account profile. |
| **Address** | Optional but useful for compliance and dispute; can be document-based or utility bill. |
| **Tax information** | For jurisdictions that require it (e.g. W-9 in US, tax ID in EU); may be required at threshold or at first payout. |

- Verification can be performed **in-house** (manual or automated) or via a **third-party provider** (e.g. Stripe Identity, Jumio, Onfido). The system stores **verification status** (pending, approved, rejected) and, where applicable, **provider reference** and **expiry** (if re-verification is required periodically).

### 6.4 Outcomes

- **Approved:** Creator can add payout methods and withdraw (subject to other gates).
- **Rejected:** Creator is notified (e.g. “Verification failed; please try again or contact support”). No payouts until resolved.
- **Pending:** Creator is notified that verification is under review; withdrawals blocked until approved.

---

## 7. Security requirements: fraud detection and suspicious activity

### 7.1 Fraud detection

- **Goal:** Detect and block payouts that are likely fraudulent (e.g. stolen accounts, fake identity, gift rings that convert to cash).
- **Signals (examples):** Unusual login or device; mismatch between account age and earnings velocity; identity document anomalies; multiple accounts linked to same bank or PayPal; chargeback or dispute history; velocity of earnings (e.g. spike in gifts from few senders). 
- **Actions:** High-risk payouts are **held** for manual review or **rejected**. Optionally, flag the **creator account** for review and temporarily disable withdrawals until cleared. Integrate with any existing anti-abuse or trust score (see CREATOR-RANKING-SYSTEM, DISCOVERY-AND-RANKING-ALGORITHM) so that gift-related fraud signals (e.g. self-gifts, rings) also affect payout eligibility.

### 7.2 Suspicious activity monitoring

- **Ongoing monitoring:** Not only at payout request time but also **continuously** (e.g. daily or real-time) on:
  - **Earnings velocity:** Sudden spike in creator_share from gifts (e.g. 10x normal in 24 hours).
  - **Sender patterns:** Many gifts from few accounts (e.g. same IP, same card); or from new accounts with no other activity.
  - **Account behavior:** Same bank account or PayPal used for multiple creator accounts; or creator account used from high-risk countries without verification.
- **Alerts:** When thresholds are breached, **alert** compliance or risk team; optionally **auto-hold** new payouts for that creator until reviewed.
- **Audit trail:** Log all risk checks, holds, and overrides so that decisions are auditable.

### 7.3 Integration with gift anti-abuse

- Gifts that are **excluded** from ranking (e.g. self-gifts, vote rings) should also be **excluded from creator earnings** (or reversed) so that fraudulent gift revenue is not paid out. The payout system consumes **earnings** that have already been adjusted by the gift/anti-abuse logic (e.g. only “valid” creator_share counts toward balance).

---

## 8. Financial safeguards

### 8.1 Reserve and hold

- **Reserve on request:** When a creator requests a payout, the **amount is reserved** immediately so the balance cannot be double-spent. If the payout fails, the reserve is **released**.
- **Holds for review:** If fraud or compliance review is needed, the system can **hold** a portion (or all) of the creator’s balance. Held balance is not available for withdrawal until the hold is released. Reason codes (e.g. “Identity review,” “Dispute,” “Fraud check”) are stored for support and audit.
- **Reserve for chargebacks/refunds:** Optional **rolling reserve** (e.g. hold 10% of earnings for 30 days) to cover chargebacks or gift refunds; the rest is available for payout. Product decision.

### 8.2 Reversals and adjustments

- **Chargeback:** If a **gift sender** charges back their coin purchase (e.g. card dispute), the platform may reverse the corresponding **creator share** (or a portion) from the creator’s balance. If balance is insufficient, the creator balance can go **negative** (recovered from future earnings) or written off per policy.
- **Refund:** If the platform refunds a gift (e.g. duplicate charge, complaint), creator share for that gift is **reversed** from balance (or from future earnings).
- **Fraud adjustment:** If fraud is confirmed (e.g. self-gift, stolen card), creator share from those transactions is **reversed** and the creator may be suspended or banned from payouts.
- All **reversals** and **adjustments** are **logged** (creator_id, amount, reason, reference to gift or payout, timestamp) for audit and support.

### 8.3 Reconciliation and audit

- **Earnings ledger:** Per creator, a **ledger** of credits (gift earnings, adjustments) and debits (payouts, reversals, holds) so that **available balance** is recomputable.
- **Payout reconciliation:** Periodically reconcile **payout records** with **provider statements** (Stripe, PayPal, bank) so that completed payouts match actual transfers.
- **Audit:** Retain payout and earnings data for the period required by law or policy (e.g. 7 years); support dispute resolution and regulatory requests.

### 8.4 Limits and velocity (summary)

| Safeguard | Purpose |
|-----------|---------|
| **Minimum payout** | Reduce processing cost; e.g. $50. |
| **Identity verification** | KYC; block payouts until verified. |
| **Fraud check at request** | Block or hold high-risk payouts. |
| **Suspicious activity monitoring** | Detect and hold abnormal earnings or behavior. |
| **Reserve on withdraw** | Prevent double-spend. |
| **Holds for review** | Pause payouts during dispute or investigation. |
| **Reversals** | Chargeback, refund, fraud adjustment; balance corrected. |
| **Velocity/limit caps (optional)** | Max payout per day/week; max per withdrawal. |

---

## 9. Data to track (payout and earnings)

### 9.1 Per creator (earnings and balance)

| Data | Purpose |
|------|---------|
| **Earnings balance (coins or USD)** | Available to withdraw; derived from gift creator_share minus payouts, holds, reversals. |
| **Total earnings (lifetime)** | Sum of all creator_share (coins or USD) ever; for display and reporting. |
| **Total paid out (USD)** | Sum of all completed payouts; for tax or creator statement. |
| **Identity verification status** | pending / approved / rejected; required for payout. |
| **Payout method(s)** | Stripe, PayPal, or bank; verified flag; last used. |

### 9.2 Per payout (withdrawal)

| Data | Purpose |
|------|---------|
| **Creator ID** | Who requested. |
| **Amount (USD)** | Withdrawal amount. |
| **Payout method** | Stripe / PayPal / bank; method identifier (e.g. last 4 of bank, PayPal email). |
| **Status** | pending / processing / completed / failed / on_hold / cancelled. |
| **Requested at** | Timestamp. |
| **Completed at** (or failed at) | Timestamp. |
| **Provider reference** | External payout ID (Stripe, PayPal, etc.) for reconciliation. |
| **Risk check result** | Pass / hold / reject; optional reason code. |
| **Reserve released** | Yes/no; when. |

### 9.3 Coin conversion record

- **Rate in effect:** e.g. 100 coins = 1 USD; effective date (or version). Stored so that historical earnings and payouts can be recalculated or reported.
- **Per gift:** creator_share_coins is stored (in gift transaction); conversion to USD for balance can be computed at credit time or at payout time using the applicable rate.

---

## 10. Summary

| Dimension | Design |
|-----------|--------|
| **Earnings source** | 70% of gift value (creator share in coins); see GIFT-AND-COIN-SYSTEM. |
| **Conversion** | 100 coins = 1 USD (configurable); creator balance in USD for payout. |
| **Platform share** | 30% retained by platform (not paid out to creator). |
| **Minimum payout** | e.g. 50 USD; withdraw only when balance ≥ minimum. |
| **Withdrawal methods** | Stripe payout, PayPal, Bank transfer (method verified before use). |
| **Workflow** | Request → validate (balance, min, identity, method) → risk check → reserve → process via provider → complete or fail → notify. |
| **Identity verification** | Required before (first) withdrawal; ID, name, DOB; optional address/tax; approve/reject. |
| **Fraud detection** | At payout request; high risk → hold or reject. |
| **Suspicious activity** | Ongoing monitoring of earnings velocity, sender patterns, account behavior; alert and optional hold. |
| **Safeguards** | Reserve on request; holds for review; reversals for chargeback/refund/fraud; reconciliation and audit trail. |

This document defines the **BeTalent creator payout system**: workflow, withdrawal methods, and financial safeguards. Implementation (providers, storage, APIs) is out of scope.
