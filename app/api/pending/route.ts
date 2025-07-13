import { NextRequest, NextResponse } from 'next/server';
import { getPendingVideos, updatePendingVideoStatus, deletePendingVideo, createCustomRemix, createCustomVideo, getDailyPrompt, createDailyRemix, getUserById, getUserByAddress } from '../db';
import { downloadFile, pinFileToIPFS } from '../ipfs';
import { PendingVideo } from '@/app/generated/prisma';
import { settleVideoPayment, markPendingVideoPaymentAsSettled } from '../payment-settlement';
import { PaymentPayload, PaymentRequirements } from 'x402/types';
import { sendFrameNotification } from "@/lib/notification-client";

// Initialize fal
const fal = require('@fal-ai/serverless-client');
fal.config({
  credentials: process.env.FAL_KEY,
});

// Global processing lock to prevent concurrent processing
let isProcessing = false;
let lastProcessingTime = 0;
const PROCESSING_COOLDOWN = 30000; // 30 seconds

/**
 * Check if we can process pending videos
 * Returns true if enough time has passed since last processing
 */
function canProcessPendingVideos(): boolean {
  const now = Date.now();
  return !isProcessing && (now - lastProcessingTime) >= PROCESSING_COOLDOWN;
}

/**
 * Process a single pending video with comprehensive error handling
 */
async function processSinglePendingVideo(pendingVideo: PendingVideo): Promise<{ success: boolean; error?: string; videoId?: string }> {
  try {
    // Get user's wallet address from the user record
    const user = await getUserById(pendingVideo.userId);
    if (!user) {
      console.error(`🔴 User not found for userId: ${pendingVideo.userId}`);
      return { success: false, error: 'User not found' };
    }
    
    console.log(`🔵 Processing ${pendingVideo.type} for wallet ${user.walletAddress}`);
    
    // Check status with fal.queue
    const status = await fal.queue.status("fal-ai/minimax/hailuo-02/standard/image-to-video", {
      requestId: pendingVideo.falRequestId,
      logs: true,
    });
    
    // Handle different status states
    switch (status.status) {
      case 'COMPLETED':
        return await handleCompletedVideo(pendingVideo);
        
      case 'FAILED':
      case 'failed':
        const errorMsg = status.error || 'Video generation failed';
        console.error(`🔴 Failed to generate ${pendingVideo.type} for wallet ${user.walletAddress}: ${errorMsg}`);
        
        await updatePendingVideoStatus({
          id: pendingVideo.id,
          status: 'failed',
          errorMessage: errorMsg,
        });
        return { success: false, error: `Video generation failed: ${errorMsg}` };
        
      case 'PENDING':
      case 'pending':
        return { success: true };
        
      case 'IN_PROGRESS':
      case 'processing':
        if (pendingVideo.status !== 'processing') {
          await updatePendingVideoStatus({
            id: pendingVideo.id,
            status: 'processing',
          });
        }
        return { success: true };
        
      default:
        console.warn(`⚠️ Unknown status for ${pendingVideo.type} (wallet: ${user.walletAddress}): ${status.status}`);
        return { success: true };
    }
    
  } catch (error) {
    let walletAddress = 'unknown';
    try {
      const user = await getUserById(pendingVideo.userId);
      if (user) {
        walletAddress = user.walletAddress;
      }
    } catch (e) {
      console.error(`Failed to get user for userId: ${pendingVideo.userId}`);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`🔴 Error processing ${pendingVideo.type} for wallet ${walletAddress}: ${errorMessage}`);
    
    await updatePendingVideoStatus({
      id: pendingVideo.id,
      status: 'failed',
      errorMessage: errorMessage,
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Handle a completed video - download, pin to IPFS, create database entries
 */
async function handleCompletedVideo(pendingVideo: PendingVideo): Promise<{ success: boolean; error?: string; videoId?: string }> {
  try {
    // Get the result
    const result = await fal.queue.result("fal-ai/minimax/hailuo-02/standard/image-to-video", {
      requestId: pendingVideo.falRequestId,
    });
    
    if (!result.video?.url) {
      throw new Error('No video URL in result');
    }
    
    console.log(`🔵 Video completed for ${pendingVideo.id}, downloading and processing...`);
    
    // Download and pin the video to IPFS
    const videoBuffer = await downloadFile(result.video.url);
    const videoIpfs = await pinFileToIPFS(videoBuffer, 'generated-video.mp4');
    
    console.log(`🔵 Video pinned to IPFS: ${videoIpfs}`);
    
    // Create the appropriate video/remix based on type
    let video;
    
    switch (pendingVideo.type) {
      case 'daily-remix':
        const dailyPrompt = await getDailyPrompt();
        ({ video } = await createDailyRemix({
          userId: pendingVideo.userId,
          promptId: dailyPrompt.id,
          videoIpfs,
          videoUrl: result.video.url,
        }));
        break;
        
      case 'custom-remix':
        ({ video } = await createCustomRemix({
          userId: pendingVideo.userId,
          videoIpfs,
          videoUrl: result.video.url,
        }));
        break;
        
      case 'custom-video':
        video = await createCustomVideo({
          userId: pendingVideo.userId,
          videoIpfs,
          videoUrl: result.video.url,
        });
        break;
        
      default:
        throw new Error(`Unknown video type: ${pendingVideo.type}`);
    }
    
    console.log(`✅ Created video ${video.id} for pending video ${pendingVideo.id}`);
    
    // Settle payment if needed
    if (pendingVideo.paymentPayload && pendingVideo.paymentRequirements && !pendingVideo.paymentSettled) {
      try {
        const settlementResult = await settleVideoPayment(
          pendingVideo.paymentPayload as PaymentPayload,
          pendingVideo.paymentRequirements as PaymentRequirements
        );
        
        if (settlementResult.success) {
          await markPendingVideoPaymentAsSettled(pendingVideo.id);
          console.log(`✅ Payment settled for ${pendingVideo.id}`);
        } else {
          console.warn(`⚠️ Payment settlement failed for ${pendingVideo.id}: ${settlementResult.error}`);
        }
      } catch (error) {
        console.error(`❌ Payment settlement error for ${pendingVideo.id}:`, error);
      }
    }
    
    // Mark as completed and delete pending video
    await updatePendingVideoStatus({
      id: pendingVideo.id,
      status: 'completed',
    });
    
    await deletePendingVideo(pendingVideo.id);

    // Send notification to user
    try {
      const user = await getUserById(pendingVideo.userId);
      if (user?.farcasterId) {
        await sendFrameNotification({
          fid: user.farcasterId,
          title: "Video Ready! 🎬",
          body: `Your ${pendingVideo.type.replace('-', ' ')} has been generated and is ready to view!`,
        });
      }
    } catch (error) {
      console.error('Failed to send completion notification:', error);
      // Don't throw - notification failure shouldn't affect video completion
    }
    
    return { success: true, videoId: video.id };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`🔴 Error handling completed video ${pendingVideo.id}:`, errorMessage);
    
    await updatePendingVideoStatus({
      id: pendingVideo.id,
      status: 'failed',
      errorMessage: errorMessage,
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Process all pending videos globally
 */
async function processAllPendingVideos(): Promise<{ processed: number; errors: number; details: string[] }> {
  if (!canProcessPendingVideos()) {
    return { processed: 0, errors: 0, details: ['Processing skipped - cooldown period'] };
  }
  
  // Set processing lock
  isProcessing = true;
  lastProcessingTime = Date.now();
  
  try {
    console.log('🔵 Starting global pending video processing...');
    
    // Get ALL pending videos
    const allPendingVideos = await getPendingVideos();
    
    if (allPendingVideos.length === 0) {
      console.log('🔵 No pending videos to process');
      return { processed: 0, errors: 0, details: ['No pending videos found'] };
    }
    
    console.log(`🔵 Processing ${allPendingVideos.length} pending videos...`);
    
    let processedCount = 0;
    let errorCount = 0;
    const details: string[] = [];
    
    // Process videos sequentially to avoid overwhelming the system
    for (const pendingVideo of allPendingVideos) {
      const result = await processSinglePendingVideo(pendingVideo);
      
      if (result.success) {
        if (result.videoId) {
          processedCount++;
          details.push(`✅ Created video ${result.videoId} from ${pendingVideo.type}`);

        }
      } else {
        errorCount++;
        details.push(`❌ Failed ${pendingVideo.type}: ${result.error}`);
      }
    }
    
    console.log(`🔵 Processing complete. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return { processed: processedCount, errors: errorCount, details };
    
  } finally {
    // Always release the processing lock
    isProcessing = false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Look up the user by wallet address
    const user = await getUserByAddress(walletAddress);
    if (!user) {
      return NextResponse.json({ success: true, pendingVideos: [], processingResult: null });
    }

    // Always attempt to process pending videos (with back-off protection)
    const processingResult = await processAllPendingVideos();

    // Get this user's pending videos after processing
    const userPendingVideos = await getPendingVideos(user.id);

    return NextResponse.json({
      success: true,
      pendingVideos: userPendingVideos,
      processingResult,
    });

  } catch (error) {
    console.error('🔴 Pending API: Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending videos' },
      { status: 500 }
    );
  }
} 