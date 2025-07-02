import { facilitator } from "@coinbase/x402";
import { Address } from "viem";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS as Address;
const network = (process.env.NEXT_PUBLIC_NETWORK || "base-sepolia") as 'base' | 'base-sepolia';

export const middleware = paymentMiddleware(
  payTo,
  {
    "/api/generate/daily": {
      price: "$0.50",
      network,
      config: {
        description: "Daily remix video generation with profile picture",
      },
    },
    "/api/generate/custom": {
      price: "$1.00",
      network,
      config: {
        description: "Custom remix video generation with profile picture",
      },
    },
    "/api/generate/custom-video": {
      price: "$1.00",
      network,
      config: {
        description: "Custom remix video generation with any picture",
      },
    },
    "/api/videos/count": {
      price: "$0.01",
      network,
      config: {
        description: "Get video count from user history",
      },
    },
  },
  facilitator,
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/generate/daily", "/api/generate/custom", "/api/generate/custom-video", "/api/videos/count"],
  runtime: "nodejs",
}; 