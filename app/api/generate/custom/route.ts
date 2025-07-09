import { NextRequest, NextResponse } from 'next/server';
import { createPendingVideo, getOrUpdateUser } from '../../db';
import { getFarcasterProfile, queueVideoGeneration, PaymentDetails } from '../../utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, walletAddress } = body;
    
    if (!prompt || !walletAddress) {
      return NextResponse.json(
        { error: 'Custom prompt and wallet address are required' },
        { status: 400 }
      );
    }
    
    const profile = await getFarcasterProfile(walletAddress);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'No Farcaster profile picture found. Please ensure your wallet is connected to a Farcaster account.' },
        { status: 400 }
      );
    }

    const { pfpUrl, farcasterId } = profile;
    const user = await getOrUpdateUser({ walletAddress, farcasterId });

    // Use shared function to queue video generation
    const { queueResult } = await queueVideoGeneration({
      prompt: prompt,
      imageUrl: pfpUrl,
      type: 'custom-remix',
    });

    const paymentDetails = (request as unknown as { paymentDetails: PaymentDetails }).paymentDetails;

    // Create pending video entry with payment details
    const pendingVideo = await createPendingVideo({
      userId: user.id,
      type: 'custom-remix',
      prompt: prompt,
      falRequestId: queueResult.request_id,
      paymentPayload: paymentDetails.paymentPayload,
      paymentRequirements: paymentDetails.paymentRequirements,
    });

    console.log('🔵 Custom Remix: Created pending video:', pendingVideo.id);
    
    return NextResponse.json({
      success: true,
      pendingVideoId: pendingVideo.id,
      requestId: queueResult.request_id,
      type: 'custom-remix',
      message: 'Video generation queued successfully. Check the Pending tab for updates.'
    });
  } catch (error) {
    console.error('🔴 Custom Remix: Error in generate-custom:', error);
    return NextResponse.json(
      { error: 'Failed to queue custom remix generation' },
      { status: 500 }
    );
  }
} 