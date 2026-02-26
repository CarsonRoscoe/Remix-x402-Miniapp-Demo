import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { getClientEvmSigner } from "./signer";

export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function pinFileToIPFS(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const signer = await getClientEvmSigner();
  const network =
    process.env.NEXT_PUBLIC_NETWORK === "base" ? "eip155:8453" : "eip155:84532";

  const client = new x402Client().register(
    network,
    new ExactEvmScheme(signer),
  );
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  try {
    const presignRes = await fetchWithPayment(
      "https://402.pinata.cloud/v1/pin/public",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileSize: fileBuffer.length }),
      },
    );

    if (!presignRes.ok) {
      const errorText = await presignRes.text();
      throw new Error(
        `Failed to get presigned URL: ${presignRes.status} ${errorText}`,
      );
    }

    const resp = (await presignRes.json()) as { url: string };

    const formData = new FormData();
    formData.append("network", "public");
    formData.append("file", new File([fileBuffer], fileName));

    const uploadRes = await fetch(resp.url, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    const uploadJson = (await uploadRes.json()).data as {
      IpfsHash: string;
      cid: string;
    };
    const cid = uploadJson.IpfsHash || uploadJson.cid;
    if (!cid) throw new Error("Failed to pin file to IPFS");

    return `ipfs://${cid}`;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "response" in error) {
      const fetchError = error as { response?: { status?: number } };
      if (fetchError.response?.status === 402) {
        throw new Error(
          "Payment required but x402 interceptor failed to handle it. Please check your wallet connection and balance.",
        );
      }
    }

    throw error;
  }
}
