import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';
import { debitInTransaction } from '@/services/wallet.service';
import type { Prisma } from '@prisma/client';

function coinsFromRefund(orderCoins: number, orderCents: number, refundedCents: number): number {
  if (orderCents <= 0 || refundedCents <= 0) return 0;
  const ratio = Math.min(1, refundedCents / orderCents);
  return Math.floor(orderCoins * ratio);
}

async function sumOrderReversalLedgerCoins(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string
): Promise<number> {
  const cases = await tx.purchaseReversalCase.findMany({
    where: { orderId },
    select: { id: true },
  });
  if (cases.length === 0) return 0;
  const refs = cases.map((c) => c.id);
  const agg = await tx.coinTransaction.aggregate({
    where: {
      fromUserId: userId,
      type: 'REFUND',
      referenceId: { in: refs },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

async function markCreatorAtRiskHolds(
  tx: Prisma.TransactionClient,
  caseId: string,
  senderId: string,
  atRiskCoinsBudget: number
) {
  if (atRiskCoinsBudget <= 0) return 0;
  const gifts = await tx.giftTransaction.findMany({
    where: {
      senderId,
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      receiverId: true,
      creatorShareCoins: true,
    },
    take: 500,
  });
  let remaining = atRiskCoinsBudget;
  let marked = 0;
  for (const g of gifts) {
    if (remaining <= 0) break;
    const atRisk = Math.min(remaining, Math.max(0, g.creatorShareCoins));
    if (atRisk <= 0) continue;
    await tx.creatorEarningsRiskHold.upsert({
      where: { reversalCaseId_giftTransactionId: { reversalCaseId: caseId, giftTransactionId: g.id } },
      create: {
        reversalCaseId: caseId,
        creatorId: g.receiverId,
        giftTransactionId: g.id,
        atRiskCoins: atRisk,
        status: 'PENDING',
        note: 'Fund source refunded/disputed; payout finality blocked until review.',
      },
      update: { atRiskCoins: atRisk, status: 'PENDING' },
    });
    remaining -= atRisk;
    marked += atRisk;
  }
  return marked;
}

export async function processRefundOrDispute(params: {
  provider: 'STRIPE';
  providerEventId: string;
  eventType: string;
  providerReferenceId: string; // checkout session id
  providerRefundId?: string | null;
  providerDisputeId?: string | null;
  refundedCents?: number;
  riskStatus: 'REFUND_REPORTED' | 'DISPUTE_OPEN' | 'DISPUTE_WON' | 'DISPUTE_LOST';
  reason?: string | null;
  metadata?: Stripe.Metadata | Record<string, unknown> | null;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<
      Array<{
        id: string;
        userId: string;
        coins: number;
        amountCents: number;
        reversedCoins: number;
        refundedCents: number;
        status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
      }>
    >`
      SELECT
        "id",
        "userId",
        "coins",
        "amountCents",
        "reversedCoins",
        "refundedCents",
        "status"::text as "status"
      FROM "CoinPurchaseOrder"
      WHERE "provider" = ${params.provider}::"CoinPurchaseProvider"
        AND "providerReferenceId" = ${params.providerReferenceId}
      LIMIT 1
      FOR UPDATE
    `;
    const order = lockedRows[0];
    if (!order) {
      return { orderNotFound: true as const };
    }

    // Hard consistency guard: never continue from a silently drifted aggregate.
    const ledgerBefore = await sumOrderReversalLedgerCoins(tx, order.id, order.userId);
    if (ledgerBefore !== order.reversedCoins) {
      throw new Error(
        `REVERSAL_LEDGER_MISMATCH: order=${order.id} order.reversedCoins=${order.reversedCoins} ledger=${ledgerBefore}`
      );
    }

    const refundedCents = Math.max(0, params.refundedCents ?? order.amountCents);
    const metadataJson = (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined;
    const targetCoins = coinsFromRefund(order.coins, order.amountCents, refundedCents);
    const remainingToReverse = Math.max(0, targetCoins - order.reversedCoins);

    const createData = {
      orderId: order.id,
      userId: order.userId,
      provider: params.provider,
      providerEventId: params.providerEventId,
      providerRefundId: params.providerRefundId ?? null,
      providerDisputeId: params.providerDisputeId ?? null,
      eventType: params.eventType,
      riskStatus: params.riskStatus,
      reversalStatus: 'PENDING' as const,
      refundedCents,
      targetReversalCoins: targetCoins,
      reversedCoins: 0,
      unrecoveredCoins: targetCoins,
      reason: params.reason ?? null,
      metadata: metadataJson,
    };
    const updateData = {
      providerEventId: params.providerEventId,
      providerRefundId: params.providerRefundId ?? undefined,
      providerDisputeId: params.providerDisputeId ?? undefined,
      riskStatus: params.riskStatus,
      refundedCents: Math.max(refundedCents, 0),
      targetReversalCoins: targetCoins,
      reason: params.reason ?? undefined,
      metadata: metadataJson,
    };

    const reversalCase = params.providerRefundId
      ? await tx.purchaseReversalCase.upsert({
          where: {
            provider_providerRefundId: { provider: params.provider, providerRefundId: params.providerRefundId },
          },
          create: createData,
          update: updateData,
        })
      : params.providerDisputeId
        ? await tx.purchaseReversalCase.upsert({
            where: {
              provider_providerDisputeId: { provider: params.provider, providerDisputeId: params.providerDisputeId },
            },
            create: createData,
            update: updateData,
          })
        : await tx.purchaseReversalCase.upsert({
            where: { provider_providerEventId: { provider: params.provider, providerEventId: params.providerEventId } },
            create: createData,
            update: updateData,
          });

    const shouldReverseCoins =
      params.riskStatus === 'REFUND_REPORTED' || params.riskStatus === 'DISPUTE_OPEN' || params.riskStatus === 'DISPUTE_LOST';
    let reversedNow = 0;
    if (remainingToReverse > 0 && shouldReverseCoins) {
      const debit = await debitInTransaction(tx, order.userId, remainingToReverse, {
        type: 'REFUND',
        referenceId: reversalCase.id,
        description: `ReversalCase:${reversalCase.id}`,
      });
      if (debit.ok) {
        reversedNow = remainingToReverse;
      } else if (debit.reason === 'Insufficient balance') {
        reversedNow = 0;
      } else {
        throw new Error(`REVERSAL_DEBIT_FAILED:${debit.reason}`);
      }
    }

    // Recompute from ledger truth after potential debit (source of truth).
    const totalReversed = await sumOrderReversalLedgerCoins(tx, order.id, order.userId);
    const unrecovered = Math.max(0, targetCoins - totalReversed);
    const reversalStatus = !shouldReverseCoins
      ? 'BLOCKED'
      : unrecovered === 0
        ? 'COMPLETED'
        : totalReversed > 0
          ? 'PARTIAL'
          : 'PENDING';

    const caseLedgerAgg = await tx.coinTransaction.aggregate({
      where: {
        fromUserId: order.userId,
        type: 'REFUND',
        referenceId: reversalCase.id,
      },
      _sum: { amount: true },
    });
    const caseReversedCoins = caseLedgerAgg._sum.amount ?? 0;
    await tx.purchaseReversalCase.update({
      where: { id: reversalCase.id },
      data: {
        reversedCoins: caseReversedCoins,
        unrecoveredCoins: Math.max(0, targetCoins - caseReversedCoins),
        reversalStatus,
        resolvedAt: reversalStatus === 'COMPLETED' ? new Date() : null,
      },
    });

    await tx.coinPurchaseOrder.update({
      where: { id: order.id },
      data: {
        status: shouldReverseCoins ? 'REFUNDED' : order.status,
        riskStatus: params.riskStatus,
        reversalStatus,
        refundedCents: Math.max(order.refundedCents, refundedCents),
        reversedCoins: totalReversed,
        unrecoveredCoins: unrecovered,
        reversalUpdatedAt: new Date(),
      },
    });

    if (shouldReverseCoins) {
      await markCreatorAtRiskHolds(tx, reversalCase.id, order.userId, targetCoins);
    } else {
      await tx.creatorEarningsRiskHold.updateMany({
        where: { reversalCaseId: reversalCase.id, status: { in: ['PENDING', 'PARTIAL', 'BLOCKED'] } },
        data: { status: 'COMPLETED', note: 'Dispute closed in favor of merchant.' },
      });
    }
    return { reversalCaseId: reversalCase.id, reversalStatus, unrecoveredCoins: unrecovered };
  });

  if ('orderNotFound' in result && result.orderNotFound) {
    return { ok: false as const, code: 'ORDER_NOT_FOUND' };
  }
  return { ok: true as const, ...result };
}
