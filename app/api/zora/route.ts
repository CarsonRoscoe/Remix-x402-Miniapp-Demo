import { NextRequest, NextResponse } from 'next/server';
import { updateCustomRemix } from '../db';
import { pinFileToIPFS, downloadFile } from '../ipfs';
import { validateMetadataJSON, ValidMetadataJSON } from '@zoralabs/coins-sdk';
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
  console.log('🔵 Zora API: GET request received');
  
  try {
    const { searchParams } = new URL(request.url);
    
    const name = searchParams.get('name');
    const description = searchParams.get('description') || '';
    const videoIpfs = searchParams.get('videoIpfs');
    const imageIpfs = searchParams.get('imageIpfs'); // optional
    const walletAddress = getAddress(searchParams.get('walletAddress') as string);

    console.log('🔵 Zora API: Request parameters:', {
      name,
      description,
      videoIpfs,
      imageIpfs,
      walletAddress
    });

    // Validate required fields
    console.log('🔵 Zora API: Validating required fields...');
    const fieldValidation = validateRequiredFields(name, description, videoIpfs);
    if (!fieldValidation.valid) {
      console.error('🔴 Zora API: Field validation failed:', fieldValidation.errors);
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: fieldValidation.errors.join(', ') 
      }, { status: 400 });
    }
    console.log('🔵 Zora API: Field validation passed');

    // Validate IPFS URI format
    console.log('🔵 Zora API: Validating IPFS URI format...');
    if (!validateIpfsUri(videoIpfs!)) {
      console.error('🔴 Zora API: Invalid videoIpfs format:', videoIpfs);
      return NextResponse.json({ 
        error: 'Invalid videoIpfs format. Must be a valid IPFS URI starting with ipfs://' 
      }, { status: 400 });
    }
    console.log('🔵 Zora API: Video IPFS URI validation passed');

    if (imageIpfs && !validateIpfsUri(imageIpfs)) {
      console.error('🔴 Zora API: Invalid imageIpfs format:', imageIpfs);
      return NextResponse.json({ 
        error: 'Invalid imageIpfs format. Must be a valid IPFS URI starting with ipfs://' 
      }, { status: 400 });
    }
    if (imageIpfs) {
      console.log('🔵 Zora API: Image IPFS URI validation passed');
    }

    let finalImageIpfs = imageIpfs;

    // If no image is provided, use the user's Farcaster profile picture
    if (!finalImageIpfs) {
      console.log('🔵 Zora API: No image provided, will fetch Farcaster profile picture');
      
      if (!walletAddress) {
        console.error('🔴 Zora API: No wallet address provided for Farcaster profile fetch');
        return NextResponse.json({ 
          error: 'walletAddress is required when no imageIpfs is provided to fetch Farcaster profile picture' 
        }, { status: 400 });
      }

      try {
        console.log('🔵 Zora API: Fetching Farcaster profile for wallet:', walletAddress);
        
        // Get user's Farcaster profile picture
        const profile = await getFarcasterProfile(walletAddress);
        console.log('🔵 Zora API: Farcaster profile response:', profile);
        
        if (!profile || !profile.pfpUrl) {
          console.error('🔴 Zora API: No Farcaster profile picture found');
          return NextResponse.json({ 
            error: 'No Farcaster profile picture found for this wallet address' 
          }, { status: 400 });
        }

        console.log('🔵 Zora API: Downloading profile picture from:', profile.pfpUrl);
        // Download and pin the profile picture to IPFS
        const profileBuffer = await downloadFile(profile.pfpUrl);
        console.log('🔵 Zora API: Profile picture downloaded, size:', profileBuffer.length);
        
        finalImageIpfs = await pinFileToIPFS(profileBuffer, 'farcaster-profile.jpg');
        console.log('🔵 Zora API: Farcaster profile picture pinned to IPFS:', finalImageIpfs);
      } catch (error) {
        console.error('🔴 Zora API: Failed to fetch and pin Farcaster profile picture:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch Farcaster profile picture and image is required for Zora metadata',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      console.log('🔵 Zora API: Using provided image IPFS:', finalImageIpfs);
    }

    // Build Zora-compliant metadata for a video asset
    console.log('🔵 Zora API: Building metadata object...');
    const metadata: ValidMetadataJSON = {
      name: name!.trim(),
      description: description.trim(),
      image: finalImageIpfs, // Always include image now
      animation_url: videoIpfs || undefined,
      content: {
        mime: 'video/mp4',
        uri: videoIpfs!,
      },
    };

    console.log('🔵 Zora API: Built metadata object:', metadata);

    // Validate metadata (throws if invalid)
    try {
      console.log('🔵 Zora API: Validating metadata with Zora SDK...');
      validateMetadataJSON(metadata);
      console.log('🔵 Zora API: Metadata validation passed');
    } catch (err: unknown) {
      console.error('🔴 Zora API: Metadata validation failed:', (err as Error)?.message);
      console.error('🔴 Zora API: Invalid metadata:', metadata);
      return NextResponse.json({ 
        error: 'Metadata validation failed', 
        details: (err as Error)?.message,
        metadata: metadata // Include the metadata for debugging
      }, { status: 400 });
    }

    // Pin metadata to IPFS
    console.log('🔵 Zora API: Pinning metadata to IPFS...');
    const buffer = Buffer.from(JSON.stringify(metadata, null, 2));
    console.log('🔵 Zora API: Metadata buffer size:', buffer.length);
    
    const ipfsUri = await pinFileToIPFS(buffer, 'zora-metadata.json');
    console.log('🔵 Zora API: Metadata pinned to IPFS:', ipfsUri);

    const response = { 
      uri: ipfsUri, 
      metadata,
      success: true 
    };
    
    console.log('🔵 Zora API: Returning success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('🔴 Zora API: Unexpected error in Zora route:', error);
    console.error('🔴 Zora API: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔵 Zora API: POST request received (database update)');
  
  try {
    const requestBody = await request.json();
    console.log('🔵 Zora API: POST request body:', requestBody);
    
    const { remixId, name, symbol, uri, payoutRecipient, chainId, currency, owner, txHash, contractAddress } = requestBody;

    if (!remixId || !name || !symbol || !uri || !payoutRecipient || !chainId || !currency || !owner || !txHash) {
      console.error('🔴 Zora API: Missing required fields in POST request:', {
        remixId: !!remixId,
        name: !!name,
        symbol: !!symbol,
        uri: !!uri,
        payoutRecipient: !!payoutRecipient,
        chainId: !!chainId,
        currency: !!currency,
        owner: !!owner,
        txHash: !!txHash
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🔵 Zora API: Updating custom remix in database...');
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

    console.log('🔵 Zora API: Database update successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔴 Zora API: Error updating remix with Zora coin data:', error);
    console.error('🔴 Zora API: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to update remix' }, { status: 500 });
  }
}