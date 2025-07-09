import { facilitator } from "@coinbase/x402";
import { Address, getAddress } from "viem";
import { exact } from "x402/schemes";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  getPaywallHtml,
  processPriceToAtomicAmount,
  toJsonSafe,
} from "x402/shared";
import {
  FacilitatorConfig,
  moneySchema,
  PaymentPayload,
  PaymentRequirements,
  Resource,
  RoutesConfig,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import { safeBase64Encode } from "x402/shared";
import { NextRequest, NextResponse } from "next/server";
import { createPendingVideo } from "./app/api/db";

const payTo = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS as Address;
const network = (process.env.NEXT_PUBLIC_NETWORK || "base-sepolia") as 'base' | 'base-sepolia';

/**
 * Custom payment middleware for async video generation flows
 * 
 * This middleware:
 * 1. Verifies payment is valid
 * 2. Stores payment details in the database with the pending video
 * 3. Does NOT settle payment immediately (settlement happens later when video is approved)
 */
export function asyncPaymentMiddleware(
  payTo: Address,
  routes: RoutesConfig,
  facilitator?: FacilitatorConfig,
) {
  const { verify } = useFacilitator(facilitator);
  const x402Version = 1;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const method = request.method.toUpperCase();

    // Find matching route configuration
    const matchingRoute = findMatchingRoute(routePatterns, pathname, method);

    if (!matchingRoute) {
      return NextResponse.next();
    }

    const { price, network, config = {} } = matchingRoute.config;
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } =
      config;

    const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
    if ("error" in atomicAmountForAsset) {
      return new NextResponse(atomicAmountForAsset.error, { status: 500 });
    }
    const { maxAmountRequired, asset } = atomicAmountForAsset;

    const resourceUrl =
      resource || (`${request.nextUrl.protocol}//${request.nextUrl.host}${pathname}` as Resource);
    const paymentRequirements: PaymentRequirements[] = [
      {
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "application/json",
        payTo: getAddress(payTo),
        maxTimeoutSeconds: maxTimeoutSeconds ?? 300,
        asset: getAddress(asset.address),
        outputSchema,
        extra: asset.eip712,
      },
    ];

    // Check for payment header
    const paymentHeader = request.headers.get("X-PAYMENT");
    if (!paymentHeader) {
      const accept = request.headers.get("Accept");
      if (accept?.includes("text/html")) {
        const userAgent = request.headers.get("User-Agent");
        if (userAgent?.includes("Mozilla")) {
          let displayAmount: number;
          if (typeof price === "string" || typeof price === "number") {
            const parsed = moneySchema.safeParse(price);
            if (parsed.success) {
              displayAmount = parsed.data;
            } else {
              displayAmount = Number.NaN;
            }
          } else {
            displayAmount = Number(price.amount) / 10 ** price.asset.decimals;
          }

          const html =
            customPaywallHtml ??
            getPaywallHtml({
              amount: displayAmount,
              paymentRequirements: toJsonSafe(paymentRequirements) as Parameters<
                typeof getPaywallHtml
              >[0]["paymentRequirements"],
              currentUrl: request.url,
              testnet: network === "base-sepolia",
            });
          return new NextResponse(html, {
            status: 402,
            headers: { "Content-Type": "text/html" },
          });
        }
      }

      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: "X-PAYMENT header is required",
          accepts: paymentRequirements,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify payment
    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(paymentHeader);
      decodedPayment.x402Version = x402Version;
    } catch (error) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: error instanceof Error ? error : "Invalid payment",
          accepts: paymentRequirements,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }

    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      paymentRequirements,
      decodedPayment,
    );
    if (!selectedPaymentRequirements) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: "Unable to find matching payment requirements",
          accepts: toJsonSafe(paymentRequirements),
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }

    const verification = await verify(decodedPayment, selectedPaymentRequirements);

    if (!verification.isValid) {
      return new NextResponse(
        JSON.stringify({
          x402Version,
          error: verification.invalidReason,
          accepts: paymentRequirements,
          payer: verification.payer,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }

    // Store payment details in request for later use by the API route
    (request as any).paymentDetails = {
      paymentPayload: decodedPayment,
      paymentRequirements: selectedPaymentRequirements,
      verification,
    };

    // Proceed with request - the API route will handle storing payment details
    return NextResponse.next();
  };
}

export const middleware = asyncPaymentMiddleware(
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