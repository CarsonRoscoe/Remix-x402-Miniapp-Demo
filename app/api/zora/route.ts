import { NextRequest, NextResponse } from 'next/server';
import { updateCustomRemix } from '../db';
import { pinFileToIPFS, downloadFile } from '../ipfs';
import { validateMetadataJSON } from '@zoralabs/coins-sdk';
import { getFarcasterProfile } from '../utils';
import { getAddress } from 'viem';

// Helper function to validate required fields
function validateRequiredFields(name: string | null, description: string | null, videoIpfs: string | null) {
  const errors = [];
  if (!name || name.trim() === '') errors.push('name is required');
  if (!description || description.trim() === '') errors.push('description is required');
  if (!videoIpfs || videoIpfs.trim() === '') errors.push('videoIpfs is required');
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}

// Helper function to validate IPFS URI format
function validateIpfsUri(uri: string): boolean {
  return uri.startsWith('ipfs://') && uri.length > 7;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const name = searchParams.get('name');
    const description = searchParams.get('description') || '';
    const videoIpfs = searchParams.get('videoIpfs');
    const imageIpfs = searchParams.get('imageIpfs'); // optional
    const category = searchParams.get('category') || 'social';
    const walletAddress = getAddress(searchParams.get('walletAddress') as string);

    // Validate required fields
    const fieldValidation = validateRequiredFields(name, description, videoIpfs);
    if (!fieldValidation.valid) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: fieldValidation.errors.join(', ') 
      }, { status: 400 });
    }

    // Validate IPFS URI format
    if (!validateIpfsUri(videoIpfs!)) {
      return NextResponse.json({ 
        error: 'Invalid videoIpfs format. Must be a valid IPFS URI starting with ipfs://' 
      }, { status: 400 });
    }

    if (imageIpfs && !validateIpfsUri(imageIpfs)) {
      return NextResponse.json({ 
        error: 'Invalid imageIpfs format. Must be a valid IPFS URI starting with ipfs://' 
      }, { status: 400 });
    }

    let finalImageIpfs = imageIpfs;

    // If no image is provided, use the user's Farcaster profile picture
    if (!finalImageIpfs) {
      if (!walletAddress) {
        return NextResponse.json({ 
          error: 'walletAddress is required when no imageIpfs is provided to fetch Farcaster profile picture' 
        }, { status: 400 });
      }

      try {
        console.log('No image provided, fetching Farcaster profile picture...');
        
        // Get user's Farcaster profile picture
        const profile = await getFarcasterProfile(walletAddress);
        
        if (!profile || !profile.pfpUrl) {
          return NextResponse.json({ 
            error: 'No Farcaster profile picture found for this wallet address' 
          }, { status: 400 });
        }

        // Download and pin the profile picture to IPFS
        const profileBuffer = await downloadFile(profile.pfpUrl);
        finalImageIpfs = await pinFileToIPFS(profileBuffer, 'farcaster-profile.jpg');
        
        console.log('Farcaster profile picture pinned to IPFS:', finalImageIpfs);
      } catch (error) {
        console.error('Failed to fetch and pin Farcaster profile picture:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch Farcaster profile picture and image is required for Zora metadata',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Build Zora-compliant metadata for a video asset
    const metadata: any = {
      name: name!.trim(),
      description: description.trim(),
      image: finalImageIpfs, // Always include image now
      animation_url: videoIpfs,
      content: {
        mime: 'video/mp4',
        uri: videoIpfs,
      },
      properties: {
        category,
      },
    };

    // Validate metadata (throws if invalid)
    try {
      validateMetadataJSON(metadata);
      console.log('Metadata validation passed');
    } catch (err: any) {
      console.error('Metadata validation failed:', err.message);
      return NextResponse.json({ 
        error: 'Metadata validation failed', 
        details: err.message,
        metadata: metadata // Include the metadata for debugging
      }, { status: 400 });
    }

    // Pin metadata to IPFS
    const buffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const ipfsUri = await pinFileToIPFS(buffer, 'zora-metadata.json');

    return NextResponse.json({ 
      uri: ipfsUri, 
      metadata,
      success: true 
    });

  } catch (error) {
    console.error('Unexpected error in Zora route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { remixId, name, symbol, uri, payoutRecipient, chainId, currency, owner, txHash, contractAddress } = await request.json();

    if (!remixId || !name || !symbol || !uri || !payoutRecipient || !chainId || !currency || !owner || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateCustomRemix(remixId, {
        name,
        symbol,
        uri,
        payoutRecipient,
        chainId,
        currency,
        owner,
        txHash,
        contractAddress
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating remix with Zora coin data:', error);
    return NextResponse.json({ error: 'Failed to update remix' }, { status: 500 });
  }
}