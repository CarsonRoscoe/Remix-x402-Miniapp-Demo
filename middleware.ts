import {
  x402HTTPResourceServer,
  x402ResourceServer,
  FacilitatorClient,
} from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import {
  EIP2612_GAS_SPONSORING,
  declareEip2612GasSponsoringExtension,
  createErc20ApprovalGasSponsoringExtension,
  declareErc20ApprovalGasSponsoringExtension,
} from "@x402/extensions";
import { x402Facilitator } from "@x402/core/facilitator";
import type { Network, PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { NextAdapter } from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactEvmScheme as ExactEvmSchemeFacilitator } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { NextRequest, NextResponse } from "next/server";
import { Address, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { publicActions } from "viem";

const payTo = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS as Address;
const network: Network =
  process.env.NEXT_PUBLIC_NETWORK === "base" ? "eip155:8453" : "eip155:84532";
const chain = process.env.NEXT_PUBLIC_NETWORK === "base" ? base : baseSepolia;

const facilitatorAccount = privateKeyToAccount(
  process.env.FACILITATOR_PRIVATE_KEY as `0x${string}`,
);
const viemClient = createWalletClient({
  account: facilitatorAccount,
  chain,
  transport: http(),
}).extend(publicActions);

const evmSigner = toFacilitatorEvmSigner({
  address: facilitatorAccount.address,
  readContract: (args) => viemClient.readContract({ ...args, args: args.args || [] }),
  verifyTypedData: (args) => viemClient.verifyTypedData(args as any),
  writeContract: (args) => viemClient.writeContract({ ...args, args: args.args || [] }),
  sendTransaction: (args) => viemClient.sendTransaction(args),
  waitForTransactionReceipt: (args) => viemClient.waitForTransactionReceipt(args),
  getCode: (args) => viemClient.getCode(args),
});

const localFacilitator = new x402Facilitator()
  .register(network, new ExactEvmSchemeFacilitator(evmSigner))
  .registerExtension(EIP2612_GAS_SPONSORING)
  .registerExtension(
    createErc20ApprovalGasSponsoringExtension(evmSigner, viemClient),
  );

const facilitatorClient: FacilitatorClient = {
  verify: async (pp: PaymentPayload, pr: PaymentRequirements) =>
    localFacilitator.verify(pp, pr),
  settle: async (pp: PaymentPayload, pr: PaymentRequirements) =>
    localFacilitator.settle(pp, pr),
  getSupported: async () => localFacilitator.getSupported() as any,
};

export const resourceServer = new x402ResourceServer(facilitatorClient).register(
  network,
  new ExactEvmScheme(),
);

const httpServer = new x402HTTPResourceServer(resourceServer, {
  "POST /api/generate/daily": {
    accepts: [{ scheme: "exact", price: "$0.50", network, payTo }],
    description: "Daily remix video generation with profile picture",
  },
  "POST /api/generate/custom": {
    accepts: [{ scheme: "exact", price: "$1.00", network, payTo }],
    description: "Custom remix video generation with profile picture",
  },
  "POST /api/generate/custom-video": {
    accepts: [{ scheme: "exact", price: "$1.00", network, payTo }],
    description: "Custom remix video generation with any picture",
  },
  "POST /api/generate/video": {
    accepts: [{ scheme: "exact", price: "$0.01", network, payTo }],
    description: "Generate an AI video from a prompt and image. Returns a public URL to view the video once ready.",
    mimeType: "application/json",
    extensions: {
      ...declareEip2612GasSponsoringExtension(),
      ...declareErc20ApprovalGasSponsoringExtension(),
      ...declareDiscoveryExtension({
        bodyType: "json",
        input: {
          prompt: "A cat dancing in a field of flowers",
          imageUrl: "https://example.com/image.jpg",
          walletAddress: "0x1234...abcd",
        },
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Text prompt describing the video to generate" },
            imageUrl: { type: "string", description: "URL of the source image to animate" },
            walletAddress: { type: "string", description: "Wallet address of the payer" },
          },
          required: ["prompt", "imageUrl", "walletAddress"],
        },
        output: {
          example: {
            success: true,
            pendingVideoId: "abc-123",
            url: "https://example.com/video/abc-123",
          },
        },
      }),
    },
  },
});
let initPromise: Promise<void> | null = httpServer.initialize().catch((err) => {
  console.error("x402 facilitator initialization failed:", err.message);
});

/**
 * Custom payment middleware for async video generation flows.
 *
 * Verifies payment upfront but does NOT settle immediately.
 * Settlement is deferred until video generation completes.
 * Payment details are forwarded to route handlers via headers.
 */
export async function middleware(request: NextRequest) {
  const adapter = new NextAdapter(request);
  const context = {
    adapter,
    path: request.nextUrl.pathname,
    method: request.method,
    paymentHeader:
      adapter.getHeader("payment-signature") || adapter.getHeader("x-payment"),
  };

  if (!httpServer.requiresPayment(context)) {
    return NextResponse.next();
  }

  if (initPromise) {
    await initPromise;
    initPromise = null;
  }

  const result = await httpServer.processHTTPRequest(context);

  switch (result.type) {
    case "no-payment-required":
      return NextResponse.next();

    case "payment-error": {
      const { response } = result;
      const headers = new Headers(response.headers);
      headers.set(
        "Content-Type",
        response.isHtml ? "text/html" : "application/json",
      );
      return new NextResponse(
        response.isHtml
          ? (response.body as string)
          : JSON.stringify(response.body || {}),
        { status: response.status, headers },
      );
    }

    case "payment-verified": {
      const paymentDetails = {
        paymentPayload: result.paymentPayload,
        paymentRequirements: result.paymentRequirements,
      };
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-payment-details", JSON.stringify(paymentDetails));
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/",
  ],
  runtime: "nodejs",
};
