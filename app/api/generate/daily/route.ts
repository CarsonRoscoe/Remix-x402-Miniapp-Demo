import { NextRequest, NextResponse } from 'next/server';
import { createCustomRemix, createCustomVideo, createDailyRemix, getDailyPrompt, getOrUpdateUser } from '../../db';
import { downloadFile, pinFileToIPFS } from '../../ipfs';
import { createEnhancedPrompt, generateAIVideo, generateTextToVideo, getFarcasterProfile } from '../../utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Custom prompt and wallet address are required' },
        { status: 400 }
      );
    }

    const dailyPrompt = await getDailyPrompt();

    const profile = await getFarcasterProfile(walletAddress);

    if (!profile) {
      return NextResponse.json(
        { error: 'No Farcaster profile found. Please ensure your wallet is connected to a Farcaster account.' },
        { status: 400 }
      );
    }

    const { pfpUrl, farcasterId } = profile;

    // Create enhanced prompt with profile remix
    const enhancedPrompt = createEnhancedPrompt(dailyPrompt.prompt, pfpUrl);

    // Generate AI video with profile picture
    const generatedVideoUrl = await generateAIVideo(enhancedPrompt, pfpUrl);
    const file = await downloadFile(generatedVideoUrl);
    const videoIpfs = await pinFileToIPFS(file, 'custom-video.mp4');

    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    const { remix, video } = await createDailyRemix({
      userId: user.id,
      promptId: dailyPrompt.id,
      videoIpfs,
    });

    return NextResponse.json({
      remixId: remix.id,
      videoId: video.id,
      success: true,
      videoUrl: generatedVideoUrl,
      ipfsUrl: videoIpfs,
      profileImageUsed: false,
      type: 'custom-video'
    });

  } catch (error) {
    console.error('Error in generate-custom-video:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom video' },
      { status: 500 }
    );
  }
} 