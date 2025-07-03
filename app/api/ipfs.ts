import { wrapFetchWithPayment } from 'x402-fetch';
import { getViemAccount } from './signer';

// Download a file from a URL and return it as a Buffer
export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Pin a file to Pinata IPFS using x402 payment
export async function pinFileToIPFS(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const account = await getViemAccount();
  const network = (process.env.NEXT_PUBLIC_NETWORK || "base-sepolia") as 'base' | 'base-sepolia';
  
  // Create fetch wrapper with x402 payment interceptor
  // Use the CDP account directly instead of converting to Viem account
  const fetchWithPayment = wrapFetchWithPayment(fetch, account);

  try {
    // 1. Get presigned upload URL from Pinata using x402 payment
    console.log('Requesting presigned URL from Pinata with x402 payment...');
    console.log('Using network:', network);
    console.log('Account address:', account.address);
    console.log('Account type:', typeof account);
    console.log('Account keys:', Object.keys(account));
    
    const presignRes = await fetchWithPayment('https://402.pinata.cloud/v1/pin/public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileSize: fileBuffer.length })
    });
    
    if (!presignRes.ok) {
      const errorText = await presignRes.text();
      console.error('Presign response error:', presignRes.status, errorText);
      throw new Error(`Failed to get presigned URL: ${presignRes.status} ${errorText}`);
    }
    
    const resp = await presignRes.json() as { url: string };

    // 2. Upload the file to the presigned URL
    const formData = new FormData();
    formData.append('network', 'public');
    formData.append('file', new File([fileBuffer], fileName));

    console.info("Uploading file to IPFS...");
    console.info("Presigned URL: ", resp.url);
    
    const uploadRes = await fetch(resp.url, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }
    
    const uploadJson = (await uploadRes.json()).data as { IpfsHash: string, cid: string };
    console.info("Upload response: ", uploadJson);
    // Pinata returns IpfsHash or cid
    const cid = uploadJson.IpfsHash || uploadJson.cid;
    if (!cid) throw new Error('Failed to pin file to IPFS');
    
    console.log('File pinned successfully to IPFS:', cid);
    return `ipfs://${cid}`;
    
  } catch (error: unknown) {
    console.error('Error in pinFileToIPFS:', error);
    
    // Check if it's a 402 error that should have been handled by x402
    if (error && typeof error === 'object' && 'response' in error) {
      const fetchError = error as { response?: { status?: number } };
      if (fetchError.response?.status === 402) {
        throw new Error('Payment required but x402 interceptor failed to handle it. Please check your wallet connection and balance.');
      }
    }
    
    throw error;
  }
}