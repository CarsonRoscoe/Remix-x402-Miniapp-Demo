import { NextRequest, NextResponse } from 'next/server';
import { createPendingVideo, getOrUpdateUser } from '../../db';
import { getFarcasterProfile, queueVideoGeneration, getPaymentDetails } from '../../utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, walletAddress } = body;

    if (!prompt || !imageUrl || !walletAddress) {
      return NextResponse.json(
        { error: 'Prompt, image URL, and wallet address are required' },
        { status: 400 }
      );
    }

    const profile = await getFarcasterProfile(walletAddress);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'No Farcaster profile found. Please ensure your wallet is connected to a Farcaster account.' },
        { status: 400 }
      );
    }

    const { farcasterId } = profile;
    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    // Use shared function to queue video generation
    const { queueResult } = await queueVideoGeneration({
      prompt: prompt,
      imageUrl: imageUrl,
      type: 'custom-video',
    });

    // Get payment details from headers
    const paymentDetails = getPaymentDetails(request);

    // Create pending video entry with payment details
    const pendingVideo = await createPendingVideo({
      userId: user.id,
      type: 'custom-video',
      prompt: prompt,
      falRequestId: queueResult.request_id,
      paymentPayload: paymentDetails.paymentPayload,
      paymentRequirements: paymentDetails.paymentRequirements,
    });

    console.log('🔵 Custom Video: Created pending video:', pendingVideo.id);

    return NextResponse.json({
      success: true,
      pendingVideoId: pendingVideo.id,
      requestId: queueResult.request_id,
      type: 'custom-video',
      message: 'Video generation queued successfully. Check the Pending tab for updates.'
    });
  } catch (error) {
    console.error('🔴 Custom Video Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue custom video generation' },
      { status: 500 }
    );
  }
} 