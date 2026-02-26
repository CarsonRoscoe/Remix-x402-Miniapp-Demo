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

function createFacilitatorClient(): FacilitatorClient {
  const pk = process.env.FACILITATOR_PRIVATE_KEY;
  if (!pk) {
    throw new Error("FACILITATOR_PRIVATE_KEY env var is required");
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  }).extend(publicActions);

  const signer = toFacilitatorEvmSigner({
    address: account.address,
    readContract: (args) => client.readContract({ ...args, args: args.args || [] }),
    verifyTypedData: (args) => client.verifyTypedData(args as any),
    writeContract: (args) => client.writeContract({ ...args, args: args.args || [] }),
    sendTransaction: (args) => client.sendTransaction(args),
    waitForTransactionReceipt: (args) => client.waitForTransactionReceipt(args),
    getCode: (args) => client.getCode(args),
  });

  const facilitator = new x402Facilitator()
    .register("eip155:8453", new ExactEvmSchemeFacilitator(signer))
    .register("eip155:84532", new ExactEvmSchemeFacilitator(signer))
    .registerExtension(EIP2612_GAS_SPONSORING)
    .registerExtension(
      createErc20ApprovalGasSponsoringExtension(signer, client.extend(publicActions)),
    );

  return {
    verify: async (pp: PaymentPayload, pr: PaymentRequirements) =>
      facilitator.verify(pp, pr),
    settle: async (pp: PaymentPayload, pr: PaymentRequirements) =>
      facilitator.settle(pp, pr),
    getSupported: async () => facilitator.getSupported() as any,
  };
}

let _facilitatorClient: FacilitatorClient | null = null;
function getFacilitatorClient(): FacilitatorClient {
  if (!_facilitatorClient) {
    _facilitatorClient = createFacilitatorClient();
  }
  return _facilitatorClient;
}

export const resourceServer = new x402ResourceServer({
  verify: (...args) => getFacilitatorClient().verify(...args),
  settle: (...args) => getFacilitatorClient().settle(...args),
  getSupported: () => getFacilitatorClient().getSupported(),
})
  .register("eip155:8453", new ExactEvmScheme())
  .register("eip155:84532", new ExactEvmScheme());

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
    accepts: [{ scheme: "exact", price: {
      amount: "100000",
      asset: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      extra: {
        "transferMethod": "permit2",
        "name": "USDT",
        "version": "2"
      }
    }, network: "eip155:84532", payTo }],
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
export async function proxy(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error("x402 proxy error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Payment processing error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/",
  ],
};
