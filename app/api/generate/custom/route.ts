import { NextRequest, NextResponse } from 'next/server';
import { 
  getFarcasterProfile, 
  generateAIVideo, 
  createEnhancedPrompt 
} from '../../utils';
import { downloadFile, pinFileToIPFS } from '../../ipfs';
import { createCustomRemix, getOrUpdateUser } from '../../db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, walletAddress } = body; // Custom prompt and wallet address from the request
    
    if (!prompt || !walletAddress) {
      return NextResponse.json(
        { error: 'Custom prompt and wallet address are required' },
        { status: 400 }
      );
    }
    
    // Fetch user's Farcaster profile picture
    const profile = await getFarcasterProfile(walletAddress);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'No Farcaster profile picture found. Please ensure your wallet is connected to a Farcaster account.' },
        { status: 400 }
      );
    }

    const { pfpUrl, farcasterId } = profile;
    
    // Create enhanced prompt with profile remix
    const enhancedPrompt = createEnhancedPrompt(prompt, pfpUrl);
    
    // Generate AI video with profile picture
    const generatedVideoUrl = await generateAIVideo(enhancedPrompt, pfpUrl);
    const file = await downloadFile(generatedVideoUrl);
    const videoIpfs = await pinFileToIPFS(file, 'custom-video.mp4');

    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    const { remix, video } = await createCustomRemix({
      userId: user.id,
      videoIpfs,
      videoUrl: generatedVideoUrl,
    });
    
    return NextResponse.json({
      remixId: remix.id,
      videoId: video.id,
      success: true,
      videoUrl: generatedVideoUrl,
      ipfsUrl: videoIpfs,
      prompt: enhancedPrompt,
      profileImageUsed: true,
      type: 'custom-remix'
    });
    
  } catch (error) {
    console.error('Error in generate-custom:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom remix video' },
      { status: 500 }
    );
  }
} 