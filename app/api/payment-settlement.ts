import { resourceServer } from "@/middleware";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { markPaymentAsSettled } from "./db";

/**
 * Settles a payment for a completed video generation.
 * Called when a video is successfully processed and approved.
 */
export async function settleVideoPayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
) {
  try {
    const settlement = await resourceServer.settlePayment(
      paymentPayload,
      paymentRequirements,
    );

    if (settlement.success) {
      return {
        success: true,
        transaction: settlement.transaction,
        network: settlement.network,
        payer: settlement.payer,
      };
    } else {
      return {
        success: false,
        error: settlement.errorReason ?? "Settlement failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Marks a pending video's payment as settled in the database
 */
export async function markPendingVideoPaymentAsSettled(pendingVideoId: string) {
  try {
    await markPaymentAsSettled(pendingVideoId);
    return true;
  } catch {
    return false;
  }
}
