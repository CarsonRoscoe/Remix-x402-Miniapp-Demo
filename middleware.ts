import { facilitator } from "./app/utils/facilitator";
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
  RequestStructure,
  Resource,
  RoutesConfig,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import { NextRequest, NextResponse } from "next/server";

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

    console.info("Pathname: ", pathname);
    console.info("Method: ", method);

    if (!matchingRoute) {
      return NextResponse.next();
    }

    const { price, network, config = {} } = matchingRoute.config;
    const { description, mimeType, maxTimeoutSeconds, inputSchema, outputSchema, customPaywallHtml, resource } =
      config;

    const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
    if ("error" in atomicAmountForAsset) {
      return new NextResponse(atomicAmountForAsset.error, { status: 500 });
    }
    const { maxAmountRequired, asset } = atomicAmountForAsset;

    const input = inputSchema
    ? ({
        type: "http",
        method,
        ...inputSchema,
      } as RequestStructure)
    : undefined;

  const requestStructure =
    input || outputSchema
      ? {
          input,
          output: outputSchema,
        }
      : undefined;

    const resourceUrl =
      resource || (`${request.nextUrl.protocol}//${request.nextUrl.host}${pathname}` as Resource);

    console.info("Request nextUrl protocol: ", request.nextUrl.protocol);
    console.info("Request nextUrl host: ", request.nextUrl.host);
    console.info("Request nextUrl pathname: ", request.nextUrl.pathname);
    console.info("Resource URL: ", resourceUrl);
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
        outputSchema: requestStructure,
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

    // Store payment details in headers instead of request object
    const paymentDetails = {
      paymentPayload: decodedPayment,
      paymentRequirements: selectedPaymentRequirements,
      verification,
    };

    // Create headers with payment details
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-payment-details', JSON.stringify(paymentDetails));

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
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
        inputSchema: {
          bodyType: "json",
          bodyFields: {
            walletAddress: "string",
            pfpUrl: "string",
            farcasterId: "number",
          },
        }
      },
    },
    "/api/generate/custom": {
      price: "$1.00",
      network,
      config: {
        description: "Custom remix video generation with profile picture",
        inputSchema: {
          bodyType: "json",
          bodyFields: {
            prompt: "string",
            walletAddress: "string",
            pfpUrl: "string",
            farcasterId: "number",
          },
        }
      },
    },
    "/api/generate/custom-video": {
      price: "$1.00",
      network,
      config: {
        description: "Custom remix video generation with any picture",
        inputSchema: {
          bodyType: "json",
          bodyFields: {
            prompt: "string",
            imageUrl: "string",
            walletAddress: "string",
          },
        }
      },
    },
    "/test": {
      price: "$0.01",
      network,
      config: {
        description: "Test page",
      },
    },
    "/api/who-am-i": {
      price: "$0.001",
      network: 'base',
      config: {
        resource: "https://remix-x402-miniapp-demo-git-feat-7bd4d3-carsonroscoes-projects.vercel.app/api/who-am-i",
        description: "Check if you're logged in",
        inputSchema: {
          queryParams: {
            name: "string"
          }
        },
      },
    }
  },
  facilitator,
);

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/", // Include the root path explicitly
  ],
  runtime: "nodejs",
}; 