import { NextRequest, NextResponse } from 'next/server';
import { createPendingVideo, getDailyPrompt, getOrUpdateUser } from '../../db';
import { queueVideoGeneration, getPaymentDetails } from '../../utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, pfpUrl, farcasterId } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const dailyPrompt = await getDailyPrompt();
    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    // Use shared function to queue video generation
    const { queueResult } = await queueVideoGeneration({
      prompt: dailyPrompt.prompt,
      imageUrl: pfpUrl,
      type: 'daily-remix',
    });

    // Get payment details from headers
    const paymentDetails = getPaymentDetails(request);

    // Create pending video entry with payment details
    const pendingVideo = await createPendingVideo({
      userId: user.id,
      type: 'daily-remix',
      prompt: dailyPrompt.prompt,
      falRequestId: queueResult.request_id,
      paymentPayload: paymentDetails.paymentPayload,
      paymentRequirements: paymentDetails.paymentRequirements,
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
    console.error('🔴 Daily Remix Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate daily remix' },
      { status: 500 }
    );
  }
} 