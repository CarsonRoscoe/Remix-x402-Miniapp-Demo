import { facilitator } from "@coinbase/x402";
import { Address } from "viem";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS as Address;
const network = (process.env.NEXT_PUBLIC_NETWORK || "base-sepolia") as 'base' | 'base-sepolia';

export const middleware = paymentMiddleware(
  payTo,
  {
    "/api/generate/daily": {
      price: "$0.05",
      network,
      config: {
        description: "Daily remix video generation with profile picture",
      },
    },
    "/api/generate/custom": {
      price: "$0.10",
      network,
      config: {
        description: "Custom remix video generation with profile picture",
      },
    },
    "/api/generate/custom-video": {
      price: "$0.20",
      network,
      config: {
        description: "Custom video generation (text-to-video)",
      },
    },
  },
  facilitator,
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/generate/daily", "/api/generate/custom", "/api/generate/custom-video"],
  runtime: "nodejs",
}; 