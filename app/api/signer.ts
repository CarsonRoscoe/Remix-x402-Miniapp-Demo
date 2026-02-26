import { CdpClient } from "@coinbase/cdp-sdk";
import { LocalAccount, toAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { toClientEvmSigner } from "@x402/evm";
import type { ClientEvmSigner } from "@x402/evm";

const cdpClient = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET,
});

export async function getServerAccount() {
    const account = await cdpClient.evm.getOrCreateAccount({
        name: "x402-mini-app",
    });
    return account;
}

export async function getViemAccount() {
    const serverAccount = await getServerAccount();
    return toAccount<LocalAccount>(serverAccount as unknown as LocalAccount);
}

export async function getClientEvmSigner(): Promise<ClientEvmSigner> {
    const account = await getViemAccount();
    const chain = process.env.NEXT_PUBLIC_NETWORK === "base" ? base : baseSepolia;
    const publicClient = createPublicClient({ chain, transport: http() });
    return toClientEvmSigner(account, publicClient);
}