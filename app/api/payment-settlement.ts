import { facilitator } from "@coinbase/x402";
import { useFacilitator as getFacilitatorSettle } from "x402/verify";
import { PaymentPayload, PaymentRequirements } from "x402/types";
import { markPaymentAsSettled } from "./db";

/**
 * Settles a payment for a completed video generation
 * This should be called when a video is successfully processed and approved
 */
export async function settleVideoPayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements
) {
  try {
    const { settle } = getFacilitatorSettle(facilitator);
    const settlement = await settle(paymentPayload, paymentRequirements);
    
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
        error: 'Settlement failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
  } catch (error) {
    return false;
  }
} 