import { CdpClient } from "@coinbase/cdp-sdk";
import { LocalAccount, toAccount } from "viem/accounts";

const cdpClient = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET,
});

export async function getServerAccount() {
    const account = await cdpClient.evm.getOrCreateAccount({
        name: "x402-mini-app",
    });
    console.log("Loaded account: ", account.address);
    return account;
}

export async function getViemAccount() {
    const serverAccount = await getServerAccount();
    return toAccount<LocalAccount>(serverAccount as unknown as LocalAccount);
}