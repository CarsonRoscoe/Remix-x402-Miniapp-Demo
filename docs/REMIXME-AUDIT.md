# RemixMe audit and cleanup plan

Investigation date: 2026-09-21. Repo: `CarsonRoscoe/Remix-x402-Miniapp-Demo` at `main` (`eaf29ed`). Read-only review of the tree; no dependency bumps, no network flips, no settlement or spend changes.

Package manager of record is **pnpm 9.15.9** (`package.json` `packageManager`, `pnpm-lock.yaml` lockfileVersion 9). Versions below labeled “resolved” come from that lockfile. `package-lock.json` is a second, older tree and must not be treated as current.

---

## A) Executive summary

- RemixMe is a **Next.js App Router** app (`next@16.2.0-canary.62`), not Vite. Payments are gated in root `proxy.ts` (Next 16’s middleware replacement) using `@x402/*@2.5.0`. The UI still sells three USDC video products; a fourth route, `POST /api/generate/video`, is the only Bazaar-decorated endpoint and charges a **hardcoded Base Sepolia mock ERC-20**, not USDC.
- The facilitator is **self-hosted**. `proxy.ts` builds an `x402Facilitator` from `FACILITATOR_PRIVATE_KEY` (missing from `env.example`) and settles later from `app/api/pending/route.ts`. That key is not the CDP facilitator. `@coinbase/cdp-sdk` is used only so the server wallet can pay Pinata’s x402 pin API (`app/api/ipfs.ts`).
- Modern CDP x402 lives at `@coinbase/cdp-sdk/x402` (`createCdpFacilitatorClient`, `createX402Server`, `CdpX402Client`). That subpath export **does not exist** on the installed SDK (`1.25.0`). It first shipped in **`@coinbase/cdp-sdk@1.53.0` (2026-07-16)**. Latest observed: **1.56.0**. `@coinbase/x402` latest is still **2.1.0** (last publish 2025-12-23) and is **imported nowhere**.
- `@x402/*` in `package.json` is the specifier `"latest"`, resolved today at **2.5.0**. Registry latest is **2.26.0**, and `@x402/next@2.26.0` peers `next >= 16.2.6`. The installed canary (`16.2.0-canary.62`) does not satisfy that peer. A blind `pnpm update` will break the install.
- Bazaar metadata is thin and pointed at the wrong route: placeholder `example.com` bodies, no discovery extension on the three routes the UI actually calls, and cataloging will not reach Coinbase’s Bazaar while verify/settle stay on a private-key facilitator.
- Coinify is client-side `createCoinCall` from `@zoralabs/coins-sdk@0.2.8` (range `^0.2.4`; registry latest **0.8.0**), always deployed with `chainId: base.id` (mainnet). Wallet config in `app/providers.tsx` and `app/viem-config.ts` is also hardcoded to Base mainnet, while `env.example` sets `NEXT_PUBLIC_NETWORK=base-sepolia`.
- Farcaster integration is the 2025 frame stack: `@farcaster/frame-sdk@0.0.60`, `launch_frame`, a `frame` manifest object, and `frame_added` webhooks. 2026 clients expect `miniapp` version `"1"`, absolute asset URLs, and embed action `launch_miniapp`. `public/` only contains `robots.txt` and `manifest.json` — referenced icons and OG images are not in the repo.
- Highest non-spend risks: unauthenticated `POST /api/notify` (open fetch to a caller-supplied URL), `GET /api/pending` processing **every** pending job (and therefore Pinata spend and settlement) for any wallet lookup, server-side fetch of arbitrary image URLs, and verify-now/settle-later so fal.ai work starts before funds move.
- Do not flip `NEXT_PUBLIC_NETWORK` to `base`, rotate CDP or facilitator keys, or change `payTo` as part of cleanup. Those are called out in section F.

---

## B) Current architecture map

```
Browser / Base App / Warpcast
  app/layout.tsx            fc:frame + fc:miniapp meta (launch_frame)
  app/providers.tsx         MiniKitProvider, chain = Base mainnet
  app/page.tsx              x402 client (wrapFetchWithPayment) → /api/generate/*
  app/components/ZoraCoinButton.tsx   createCoinCall on Base mainnet
        │
        ▼
proxy.ts                    x402HTTPResourceServer (NextAdapter from @x402/next)
  verify only; settle deferred via x-payment-details header
  self-hosted facilitator (FACILITATOR_PRIVATE_KEY)
        │
        ▼
app/api/generate/{daily,custom,custom-video,video}/route.ts
  fal queue: fal-ai/minimax/hailuo-02/standard/image-to-video
  Prisma PendingVideo stores payment payload
        │
        ▼
GET /api/pending            polls fal, pins video, settles payment, notifies
  app/api/ipfs.ts           server CDP wallet pays https://402.pinata.cloud
  app/api/signer.ts         CdpClient account name "x402-mini-app"
  app/api/payment-settlement.ts
```

| Path | Role |
| --- | --- |
| `proxy.ts` | Payment gate, prices, Bazaar extension, gas-sponsoring extensions, facilitator |
| `app/page.tsx` | Product UI and x402 client |
| `app/viem-config.ts` | Wagmi config used to sign payments; Base mainnet only |
| `app/api/utils.ts` | fal queue + image download; `getPaymentDetails` |
| `app/api/pending/route.ts` | Global worker disguised as a user poll |
| `app/api/ipfs.ts`, `app/api/signer.ts` | Pinata x402 paid by CDP server wallet |
| `app/api/zora/route.ts`, `app/components/ZoraCoinButton.tsx` | Coinify metadata + onchain deploy |
| `app/.well-known/farcaster.json/route.ts` | Mini App manifest |
| `app/api/webhook/route.ts`, `lib/notification*.ts` | Frame notifications via Redis |
| `app/api/farcaster/user/route.ts` | Neynar wallet → FID fallback |
| `app/utils/farcaster.ts` | MiniKit context, else Neynar |
| `prisma/schema.prisma` | Users, videos, remixes, daily prompts, notification tokens, pending payments |
| `scripts/seed-daily-prompts.ts` | Seven prompts dated 2025-07-08 through 2025-07-14 |
| `vercel.json` | Frame-embedding headers only. No crons, no function config |
| `env.example` | Incomplete relative to code |

Routes the UI calls: `POST /api/generate/daily` ($0.50), `POST /api/generate/custom` ($1.00), `POST /api/generate/custom-video` ($1.00). All use `price: "$…"` so the SDK maps them to the network’s USDC. `POST /api/generate/video` is not referenced by `app/page.tsx`.

`npm run worker` and `npm run worker:dev` point at `scripts/trigger-worker.js` and `scripts/worker-dev.js`, which are not in the tree.

---

## C) Dependency table

Resolved = `pnpm-lock.yaml` on this commit. Recommended = registry `latest` **or** a pin, as of 2026-09-21. Do not treat “recommended” as “upgrade in one PR”.

| Package | package.json | Resolved (pnpm) | Recommended | Notes |
| --- | --- | --- | --- | --- |
| `next` | `16.2.0-canary.62` | same | `16.3.5` (stable) | README says Next 15. Canary is older than the peer floor of `@x402/next@2.26`. |
| `react` / `react-dom` | `^18` | `18.3.1` | `19.3.0` when moving to Next 16.3 / OnchainKit 1.x | OnchainKit `0.38.16` already peers `react ^18 \|\| ^19`. OnchainKit `1.1.3` **requires** React 19. |
| `eslint` | `^8` | `8.57.1` | align with `eslint-config-next` | |
| `eslint-config-next` | `14.2.15` | `14.2.15` | `16.3.5` | Three major versions behind the framework. |
| `@x402/core` | `latest` | **2.5.0** | pin `2.26.0` only with Next ≥ 16.2.6 | ~21 minor versions behind. `"latest"` is not reproducible. |
| `@x402/evm` | `latest` | **2.5.0** | `2.26.0` (same train) | |
| `@x402/extensions` | `latest` | **2.5.0** | `2.26.0` | `declareDiscoveryExtension` call shape may change. Re-typecheck. |
| `@x402/fetch` | `latest` | **2.5.0** | `2.26.0` | Used by the page and by Pinata pinning. |
| `@x402/next` | `latest` | **2.5.0** | `2.26.0` | Only `NextAdapter` is imported. 2.26 peers `next >= 16.2.6` and `@x402/paywall`. 2.5 peers `next ^16.0.10`. |
| `@coinbase/x402` | `latest` | **2.1.0** | remove, or keep only if a ticket still needs `createFacilitatorConfig` | No source imports. Pulls a second `@coinbase/cdp-sdk@1.44.1`. Last publish 2025-12-23. npm’s `package-lock.json` still resolves this name to **0.4.1**. |
| `@coinbase/cdp-sdk` | `^1.25.0` | **1.25.0** (direct) and **1.44.1** (via `@coinbase/x402`) | **1.56.0** | `./x402` export starts at **1.53.0**. 1.25 has only `.` and `./auth`. |
| `@coinbase/onchainkit` | `latest` | **0.38.16** | pin `0.38.16` until a dedicated MiniKit upgrade; then `1.1.3` | 1.1.3 peers `react ^19`, `wagmi ^2.16`, `viem ^2.27`. Current wagmi is **2.15.6**. |
| `viem` | `^2.31.7` | `2.31.7` | `^2.56` inside the 2.x line (`2.56.8`) | Stay on v2 while wagmi is v2. |
| `wagmi` | `^2.11.0` | `2.15.6` | `^2.16` before OnchainKit 1.x; do not jump to wagmi 3 (`3.7.7`) in the same change | OnchainKit 1.1 peers wagmi 2. |
| `@wagmi/core` | `^2.17.3` | `2.17.3` | keep on 2.x with wagmi | |
| `@farcaster/frame-sdk` | `^0.0.60` | `0.0.60` | migrate to `@farcaster/miniapp-sdk@0.3.0` | frame-sdk latest is `0.2.0` but the product name moved. Direct imports: `lib/notification.ts`, `lib/notification-client.ts`. OnchainKit 0.38 also depends on `frame-sdk@0.0.60`. |
| `@farcaster/miniapp-sdk` | not installed | — | `0.3.0` | Published 2026-04-01. |
| `@neynar/nodejs-sdk` | `^3.25.0` | `3.25.0` | spike before `3.177.0` | Same major, large API surface. `fetchBulkUsersByEthOrSolAddress` must be re-checked. |
| `@zoralabs/coins-sdk` | `^0.2.4` | **0.2.8** | spike `0.8.0`; do not bump blindly | 0.3–0.8 crossed creator-coin and call-shape changes. App uses `createCoinCall`, `DeployCurrency`, `validateMetadataJSON`, `cleanAndValidateMetadataURI`. |
| `@fal-ai/client` | `^1.5.0` | `1.5.0` | `1.10.1` | Used for `fal.storage.upload`. |
| `@fal-ai/serverless-client` | `^0.15.0` | `0.15.0` | remove after porting queue calls | npm description: deprecated in favor of `@fal-ai/client`. Latest is still 0.15.0. |
| `@prisma/client` / `prisma` | `^6.10.1` | `6.11.1` | `6.19.3` (stay on 6) | Prisma 7.10 and 8 RC exist. Not worth a major for this cleanup. |
| `@upstash/redis` | `^1.35.1` | `1.35.1` | `1.39.0` | Optional at runtime; notifications no-op if unset. |
| `ffmpeg-static`, `fluent-ffmpeg`, `@types/fluent-ffmpeg` | present | 5.2.0 / 2.1.3 / 2.1.27 | remove | No imports in app or scripts. |
| `typescript` | `^5` | `5.8.3` | stay on 5.x | |

`package-lock.json` (npm) does **not** contain `@x402/core` at all. It still lists legacy `x402@0.4.3`, `x402-fetch@0.4.1`, `x402-next@0.4.1`, `@coinbase/x402@0.4.1`, and `@coinbase/cdp-sdk@1.30.0`. `npm install` from that lockfile cannot build the current source. `.yarnrc.yml` is also present (“You can remove this file if you don't want to use Yarn”). Three installers, one real lockfile.

---

## D) Findings by area

### x402 / CDP — severity High

**What the code does.** `proxy.ts` registers `ExactEvmScheme` for `eip155:8453` and `eip155:84532` on both the resource server and a local facilitator. The facilitator signer is `privateKeyToAccount(FACILITATOR_PRIVATE_KEY)` with `writeContract` / `sendTransaction`. It also registers `EIP2612_GAS_SPONSORING` and `createErc20ApprovalGasSponsoringExtension`. Verify runs in the proxy; `settlePayment` runs only after fal reports the video complete (`app/api/pending/route.ts` → `app/api/payment-settlement.ts`).

**CDP is not on the payment path.** `app/api/signer.ts` constructs `CdpClient` and `getClientEvmSigner()` solely for `pinFileToIPFS` against `https://402.pinata.cloud/v1/pin/public`. Account name is `"x402-mini-app"`. That spends the CDP wallet secret’s balance whenever a video (or Zora metadata image) is pinned.

**Migration path (do this on Base Sepolia first).**

1. Pin today’s resolved versions so `"latest"` cannot move the tree.
2. Raise `@coinbase/cdp-sdk` to **≥ 1.53.0** (1.56.0 current) so `@coinbase/cdp-sdk/x402` exists. Drop the duplicate 1.44.1 copy by removing unused `@coinbase/x402`, unless a ticket explicitly wants `createFacilitatorConfig` from that package.
3. Replace `createFacilitatorClient()` in `proxy.ts` with `createCdpFacilitatorClient()` from `@coinbase/cdp-sdk/x402`. Official shape:

   ```ts
   import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
   import { x402ResourceServer } from "@x402/core/server";
   import { ExactEvmScheme } from "@x402/evm/exact/server";

   const facilitator = createCdpFacilitatorClient();
   const server = new x402ResourceServer(facilitator).register(
     "eip155:84532",
     new ExactEvmScheme(),
   );
   ```

   Credentials: `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET`. **No wallet secret and no `FACILITATOR_PRIVATE_KEY`.** `CDP_WALLET_SECRET` stays only for the Pinata payer and any future `CdpX402Client`.
4. Bump `@x402/*` to 2.26.0 **in the same change as Next ≥ 16.2.6** (prefer stable `16.3.5`). `@x402/next@2.26` will not peer-install against `16.2.0-canary.62`.
5. Re-typecheck `declareDiscoveryExtension`, `toFacilitatorEvmSigner`, `wrapFetchWithPayment`, and `NextAdapter`. The 2.26 discovery helper’s documented options (`method`, `pathParamsSchema`, `body`) are not what `proxy.ts` passes today (`bodyType`, `input`, `inputSchema`).

**Breaking changes and risk.**

| Change | Risk |
| --- | --- |
| Self-hosted facilitator → CDP facilitator | CDP settles a supported asset set (USDC on Base / Base Sepolia). The mock ERC-20 `0xeED520980fC7C7B4eB379B96d61CEdea2423005a` on `POST /api/generate/video` is unlikely to settle there. Gas-sponsoring extensions registered on the local facilitator do not automatically exist on CDP’s hosted facilitator. |
| Deferred settle | Video jobs run for minutes. EIP-3009 authorizations expire, and USDC is not locked at verify time. A payer can move funds after verify; fal.ai cost is already spent. CDP may also reject a late settle. Test the real latency on Sepolia before relying on it. |
| `@x402/next` 2.5 → 2.26 | Peer on Next, and `@x402/paywall` becomes a peer. This app does not render the built-in paywall; it still must install or the peer check fails. |
| `@coinbase/x402@2.1` `createFacilitatorConfig` | Older supported path (still described in 2025 migration writeups). Prefer `createCdpFacilitatorClient` so there is one CDP entry point. Do not wire both. |
| `CdpX402Client` | Client-side replacement for the browser `x402Client` + wagmi wallet. It provisions a **server** wallet and, by default, has **no spend controls**. Wrong tool for the user’s wallet. Keep `wrapFetchWithPayment` + the connected wagmi client for the mini app. |
| Dual lockfiles | `npm ci` and `pnpm i` produce different graphs. CI must be identified before any bump. |

`@coinbase/x402` is not deprecated on npm, but it is stale relative to `cdp-sdk/x402` and unused here. Leaving `"latest"` on it is how the next install drifts.

### Coinify / Zora — severity High (chain), Med (SDK)

End-to-end today:

1. UI (`ZoraCoinButton`) calls `GET /api/zora` with name, description, `videoIpfs`, wallet.
2. The route builds metadata (`animation_url` + `content.uri` = video, image = supplied IPFS or a downloaded Farcaster PFP) and `validateMetadataJSON` from coins-sdk **0.2.8**.
3. Metadata JSON is pinned via Pinata x402 (server wallet spend).
4. Client calls `createCoinCall({ ..., currency: ZORA \| ETH, chainId: base.id, platformReferrer: NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS })` and `writeContractAsync`.
5. `POST /api/zora` writes `zoraCoinData` onto the remix row. No auth.
6. “View on Zora” uses `https://zora.co/coin/base:{contract}?referrer=…`. `RemixCard.tsx` instead opens `https://zora.co/collect/{contract}?referrer=…`.

**Do not bump to 0.8.0 as a version-only PR.** Between 0.2.8 and 0.8.0 the SDK went through creator-coin releases (0.3.x) and several call-shape revisions. `createCoinCall` arguments, `DeployCurrency`, and metadata validators need a spike against current Zora docs. The button already labels itself experimental.

Other risks:

- **Mainnet deploy from a Sepolia-configured app.** `chainId: base.id` ignores `NEXT_PUBLIC_NETWORK` and the connected `chainId` prop (the prop is stored in the DB, not passed to `createCoinCall`).
- **`platformReferrer`** is the payments receiver. `env.example` defaults it to the zero address, which will revert or mis-route fees if that value is what production has.
- **`GET /api/zora` downloads `pfpUrl` server-side** with no host allowlist (`downloadFile`).
- **`POST /api/zora` is unauthenticated.** Anyone who knows `remixId` can mark a remix coined and attach an arbitrary contract.
- IPFS pin + coin deploy are two transactions of spend (Pinata via CDP, then the user’s wallet on Base). Failure between them leaves metadata pinned and no coin.
- Payout recipient is the connected wallet, which is correct for the user and easy to confuse with `payTo`.

### Bazaar / discovery — severity High

Discovery is not a database. It is the `bazaar` extension on a payment-required response. Facilitators that implement the catalog (CDP’s does; this repo’s private-key facilitator does not) read that extension when a payment is settled and index the resource.

Current declaration, only on `POST /api/generate/video` inside `proxy.ts`:

- Description: “Generate an AI video from a prompt and image…”
- Price: `{ amount: "100000", asset: "0xeED520980fC7C7B4eB379B96d61CEdea2423005a", extra: { transferMethod: "permit2", name: "Mock Generic ERC20", version: "2" } }` and **network forced to `eip155:84532`** even if `NEXT_PUBLIC_NETWORK=base`.
- `declareDiscoveryExtension` example body uses `https://example.com/image.jpg` and wallet `0x1234...abcd`.
- Output example promises `{ success, pendingVideoId, url }` and does not say the URL is a pending page, that generation is async, or that payment settles only after fal succeeds.
- The three UI routes have a price and a one-line description and **no** input schema, output example, or `mimeType`.
- Extensions for EIP-2612 and ERC-20 approval gas sponsoring are attached only to the mock-token route.

**What “improving bazaar data” should mean, concretely:**

1. Decide which routes are public agent APIs. If the product is the three USDC routes, put discovery on those and stop advertising the mock-token route (or mark it test-only). If the mock route is the demo, say so in the description and do not let agents think it is RemixMe USDC video.
2. For each advertised route, declare method, body schema, required fields, and constraints that match the handler (`prompt` string length, `imageUrl` https, `walletAddress` checksum). Examples must validate against the schema. No `example.com`.
3. Output schema should match the real JSON (`pendingVideoId`, status URL `/video/{id}`, not a finished mp4).
4. Descriptions should state price asset, network (CAIP-2), async behavior, and that a second request is not how you poll.
5. Resource URL must be absolute (`NEXT_PUBLIC_URL` + path). Relative URLs are dropped by catalog validation.
6. Settle at least once through the **CDP facilitator** on Base Sepolia. A perfect schema on a self-hosted facilitator never shows up in the CDP Bazaar.
7. Add a check (unit or script) that runs `validateDiscoveryExtension` so the next price edit cannot ship an invalid extension. Recent x402 builds reject extensions missing `info.input.method` or using external `$ref`.
8. Keep schema, price, and README in the same PR when any of them change.

### Farcaster / miniapps / Base App — severity High

| Surface | Current | 2026 expectation |
| --- | --- | --- |
| SDK | `@farcaster/frame-sdk@0.0.60` plus OnchainKit MiniKit 0.38 | `@farcaster/miniapp-sdk`. OnchainKit 1.x is a separate breaking UI upgrade. |
| Embed | `fc:frame` and `fc:miniapp` in `app/layout.tsx`, action `type: "launch_frame"` | `fc:miniapp` with action `launch_miniapp`. `launch_frame` is compatibility-only. Button title must stay ≤ 32 characters. `🎬 Launch ${PROJECT_NAME}` can exceed that. |
| Manifest | `app/.well-known/farcaster.json/route.ts` returns top-level `version: "next"`, `button`, `accountAssociation`, a small `miniapp` object (`version: "1"`), and a large legacy `frame` object | Required: `accountAssociation` + `miniapp` (or legacy `frame`). `miniapp.version` must be `"1"`. Required inside it: `name`, `homeUrl`, `iconUrl`. |
| Assets | `iconUrl` / splash / hero come from env and are often root-relative (`/icon.png`). `public/` has **no** png/svg binaries. `screenshotUrls` is `[]` and is stripped by `withValidProperties`. | Absolute `https` URLs. Icon guidance is a 1024×1024 PNG. Splash ~200×200. At least one screenshot for directory quality. |
| Tags / category | `tags: ["AI", "video", "generation", "base", "farcaster", "x402"]`, `primaryCategory` from env defaulting to `Entertainment` | Clients expect up to 5 lowercase tags, short length, and a known category slug (`entertainment`, not `Entertainment`). |
| Odd flags | `frame.isBaseApp`, `discoverable`, `defaultLaunch` set to the **string** `"true"` | Not part of the Farcaster manifest schema. `withValidProperties` only allows strings, so real booleans cannot be passed through that helper. Base-specific ownership belongs in Base’s builder/account fields if still required, not as stringly flags. |
| Domain association | `FARCASTER_*` env vars, README says `npx create-onchain --manifest` | Domain in the signed payload must equal the live host (`remixme.xyz` or whatever serves the file). Regenerating is a prod signing action (section F). Warpcast’s manifest tool is the current publisher flow. |
| Webhook | `frame_added` / `frame_removed` / `notifications_enabled` / `notifications_disabled`. Verifies FID key via Optimism Key Registry `0x00000000Fc1237824fb747aBDE0FF18990E59b7e`. | Confirm current webhook event names (`miniapp_added` vs `frame_added`) against the 2026 spec before rewriting. Key-registry check itself is still the right idea. |
| Chain | `MiniKitProvider` and `app/viem-config.ts` use Base **mainnet only** | Must follow `NEXT_PUBLIC_NETWORK`. A Sepolia payment cannot be signed by a mainnet-only wagmi config. This splits wallet UX from the x402 network. |
| Copy / docs | `MINIAPP_TESTING.md` still says version `"next"`, Warpcast directory submission, and “Quick Auth Server” | Update after the manifest change. `robots.txt` sitemap is `https://your-domain.com/sitemap.xml`. |
| Notifications | Redis key is `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME`. `POST /api/notify` has no auth. | See security. |

`context.user.location?.description` is stored as `custodyAddress` in `app/utils/farcaster.ts`. That field is not a custody address.

Daily prompts: seed data is 8–14 July 2025. `getDailyPrompt()` falls back to the latest past row, so “daily” has been one stale prompt since mid-July 2025 unless production DB was edited by hand.

### Security and secrets — severity High

No live private keys or API secrets are committed. `.env*` is gitignored. `env.example` uses placeholders. That part is fine.

| Issue | Severity | Where |
| --- | --- | --- |
| `FACILITATOR_PRIVATE_KEY` can sign and send transactions, including gas-sponsored approvals, and is undocumented in `env.example` | High | `proxy.ts` |
| `CDP_API_KEY_SECRET` and `CDP_WALLET_SECRET` pay for Pinata pins. Compromise drains the server wallet | High | `app/api/signer.ts`, `app/api/ipfs.ts` |
| `POST /api/notify` accepts `notification.notificationDetails` and the server `fetch`es that URL. Unauthenticated SSRF. With only an FID it can also push a notification through the stored token | High | `app/api/notify/route.ts`, `lib/notification-client.ts` |
| `GET /api/pending?walletAddress=` runs `processAllPendingVideos()` for **all users**, which downloads fal output, pins to Pinata (spend), and settles payments. In-memory `isProcessing` does not work across Vercel isolates. No `maxDuration` | High | `app/api/pending/route.ts` |
| Server fetches arbitrary `imageUrl` / `pfpUrl` (fal upload and Zora image fallback) | High | `app/api/utils.ts`, `app/api/zora/route.ts` |
| Verify-then-settle does not escrow USDC. Failed or slow jobs create unpaid fal spend; successful jobs can fail settle and give a free video | High | `proxy.ts`, `pending/route.ts` |
| `POST /api/zora` and `GET /api/videos?walletAddress=` have no auth. History is enumerable by address | Med | `app/api/zora/route.ts`, `app/api/videos/route.ts` |
| Payment payloads (signatures) stored in Postgres `PendingVideo.paymentPayload` and echoed into logs in places | Med | `prisma/schema.prisma`, route `console.log`s |
| `NEXT_PUBLIC_NEYNAR_API_KEY` is documented but unused. Server reads `NEYNAR_API_KEY`. Copying the same key into the public var ships it to the client | Med | `env.example`, README |
| `NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS` is public by design (payTo and Zora referrer). Do not also put facilitator or CDP secrets in `NEXT_PUBLIC_*` | Low | `proxy.ts` |
| Webhook trusts decoded header FID after a registry read, but does not appear to check the outer webhook signature beyond key ownership. Re-read against the current miniapp webhook spec before changing it | Med | `app/api/webhook/route.ts` |
| CSP is `frame-ancestors *` and `X-Frame-Options: ALLOWALL` | Low (intentional for embeds) | `vercel.json` |

### Other debt — severity Med

- README describes an image mini app, Next 15, `middleware.ts`, `app/utils.ts`, custom video at **$2**, clone path `x402MiniApp`, and a “Notification Secret” that does not exist. In-app prices are $0.50 / $1.00 / $1.00. README’s x402 link points at Base wallet-app docs, not x402.org or CDP x402.
- `app/test/page.tsx` is an unauthenticated SoundCloud embed named “Protected Content”.
- `generateAIVideo` in `app/api/utils.ts` is unused. Comments say Kling 2.1; the model id is MiniMax Hailuo.
- `ffmpeg-*` dependencies and worker npm scripts are dead.
- `app/api/utils.ts` mixes ESM `@fal-ai/client` and `require('@fal-ai/serverless-client')`.
- No tests. `postinstall` runs `prisma generate` into gitignored `app/generated/prisma`.
- No `export const maxDuration` on the long pending/pin route. Vercel will time out mid-pin.
- README claims MIT; there is no `LICENSE` file.
- `robots.txt` sitemap host is `your-domain.com`.
- Prisma client is constructed in `app/api/db.ts` from `DATABASE_URL` with no pooler guidance for serverless.

---

## E) Recommended cleanup plan

Linear project: **RemixMe**. Order is the safest sequence. Each title is one ticket. Do not combine phases 3–6 into a single PR.

### Phase 0 — Freeze and tell the truth

1. **Pin the install: replace `"latest"` and delete the unused npm lockfile** (keep pnpm only, or the reverse if CI is npm — check Vercel before deleting).
2. **Rewrite README to match the video app, `proxy.ts`, and real prices.**
3. **Document every env var the code reads, including `FACILITATOR_PRIVATE_KEY`, without putting a real key in git.**
4. **Remove or restore `worker` / `worker:dev` scripts and drop unused ffmpeg dependencies.**

### Phase 1 — Stop unauthenticated spend and SSRF

5. **Auth-gate `POST /api/notify` and ignore caller-supplied notification URLs.**
6. **Split pending polling from the global worker; stop `GET /api/pending` from settling and pinning for every user.**
7. **Move completion processing to an authenticated cron with `maxDuration` and a real lock (DB row or Redis).**
8. **Allowlist hosts for server-side image fetch (fal upload and Zora PFP).**
9. **Require a signed wallet or session on `POST /api/zora`.**

### Phase 2 — One framework upgrade, still on the current facilitator

10. **Upgrade Next canary to 16.3.5 and React 19, with eslint-config-next matched.**
11. **Pin `@x402/*` to 2.26.0 and fix compile breaks in `proxy.ts` and clients. Stay on Base Sepolia.**
12. **Typecheck `declareDiscoveryExtension` against 2.26 and add a validation test.**

### Phase 3 — CDP facilitator (Sepolia only)

13. **Bump `@coinbase/cdp-sdk` to 1.56.x and switch verify/settle to `createCdpFacilitatorClient`.**
14. **Keep `FACILITATOR_PRIVATE_KEY` behind an env flag until Sepolia USDC verify+deferred-settle matches today’s behavior.**
15. **Decide the mock ERC-20 route: CDP-unsupported, so remove it from the facilitator migration or keep it on the old signer explicitly.**
16. **Measure fal latency vs authorization expiry; settle earlier or fail the job before queueing if settle cannot wait.**

### Phase 4 — Bazaar quality

17. **Attach real discovery extensions to the routes agents should call (likely the USDC routes, not only `/api/generate/video`).**
18. **Replace placeholder examples with schema-valid prompt, image, and wallet samples and an async output schema.**
19. **Run one Sepolia settlement through CDP and confirm the resource appears in the Bazaar.**
20. **Delete or un-index the duplicate generate route so catalog entries do not disagree on price and asset.**

### Phase 5 — Mini App / Base App compliance

21. **Add real absolute icon, splash, hero, and screenshot assets and fix `farcaster.json` field types.**
22. **Switch embeds to `launch_miniapp` and make `miniapp` the primary manifest object; trim tags and category.**
23. **Align wagmi and MiniKitProvider with `NEXT_PUBLIC_NETWORK` (still do not flip production to mainnet in this ticket).**
24. **Replace `@farcaster/frame-sdk` notification types with `@farcaster/miniapp-sdk` and confirm webhook event names.**
25. **OnchainKit 0.38 → 1.1 as its own PR after React 19 (MiniKit hooks will move).**

### Phase 6 — Coinify

26. **Spike `@zoralabs/coins-sdk` 0.8 against `createCoinCall` and metadata validation; write the breaking diff before upgrading.**
27. **Pass the connected chain into `createCoinCall` and block coin deploy when the chain is not Base mainnet (or when referrer is the zero address).**
28. **Use one Zora URL shape (`/coin/base:`) in the button and in `RemixCard`.**

### Phase 7 — Product residue

29. **Replace July 2025 daily prompts with a generator or a clearly labeled single prompt.**
30. **Port fal queue calls off `@fal-ai/serverless-client` onto `@fal-ai/client`.**
31. **Delete `app/test/page.tsx` and unused `generateAIVideo`.**
32. **Patch Prisma 6.11 → 6.19 and document the Postgres pooler URL for Vercel.**

---

## F) Do not touch without Carson

- `NEXT_PUBLIC_NETWORK` in production. `env.example` is `base-sepolia`. Setting `base` changes pay network to `eip155:8453` and the CDP/Pinata signer chain. Do not flip it in a cleanup PR.
- `NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS` (`payTo`, Zora `platformReferrer`, referrer query). Changing it redirects USDC and coin fees.
- `FACILITATOR_PRIVATE_KEY`. It settles user payments and can sponsor approvals. Rotation is an ops action, not a refactor. Do not print it, commit it, or move it to `NEXT_PUBLIC_*`.
- `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`, and the CDP account named `x402-mini-app`. That account pays Pinata. Do not drain, recreate, or point a new `CdpX402Client` at it without spend controls.
- `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, `FARCASTER_SIGNATURE`. They bind the domain. Regenerating them is a signed prod change.
- Any mainnet `createCoinCall`. The button already targets Base mainnet.
- Settling or replaying `PendingVideo.paymentPayload` rows already in production. A migration that calls `settle` in a loop can charge users or fail authorizations.
- The mock token `0xeED520980fC7C7B4eB379B96d61CEdea2423005a` and its permit2 extra, until Carson decides whether that route is still the Bazaar demo.
- Vercel production env and the database URL. This audit did not read hosted env values.

---

## Suggested first PR (still not this audit’s job)

Phase 0 ticket 1 plus Phase 1 tickets 5–6, on Sepolia, with no facilitator replacement and no `NEXT_PUBLIC_NETWORK` change. That removes the open notify proxy and the “any visitor triggers global pin and settle” behavior before dependency risk.
