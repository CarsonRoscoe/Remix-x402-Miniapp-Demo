import { NextRequest, NextResponse } from 'next/server';
import { createPendingVideo, getDailyPrompt, getOrUpdateUser } from '../../db';
import { getFarcasterProfile, queueVideoGeneration } from '../../utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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
    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    // Use shared function to queue video generation
    const { queueResult } = await queueVideoGeneration({
      prompt: dailyPrompt.prompt,
      imageUrl: pfpUrl,
      type: 'daily-remix',
    });

    // Create pending video entry
    const pendingVideo = await createPendingVideo({
      userId: user.id,
      type: 'daily-remix',
      falRequestId: queueResult.request_id,
    });

    console.log('🔵 Daily Remix: Created pending video:', pendingVideo.id);

    return NextResponse.json({
      success: true,
      pendingVideoId: pendingVideo.id,
      requestId: queueResult.request_id,
      type: 'daily-remix',
      message: 'Video generation queued successfully. Check the Pending tab for updates.'
    });

  } catch (error) {
    console.error('🔴 Daily Remix: Error in generate-daily:', error);
    return NextResponse.json(
      { error: 'Failed to queue daily remix generation' },
      { status: 500 }
    );
  }
} 