import { NextRequest, NextResponse } from 'next/server';
import { getPendingVideos, getUser, updatePendingVideoStatus, deletePendingVideo, createCustomRemix, createCustomVideo } from '../db';
import { downloadFile, pinFileToIPFS } from '../ipfs';
import { PendingVideo } from '@/app/generated/prisma';

// Initialize fal
const fal = require('@fal-ai/serverless-client');
fal.config({
  credentials: process.env.FAL_KEY,
});

async function processPendingVideos(pendingVideos: PendingVideo[]) {
  console.log('🔵 Pending API: Processing pending videos...');
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const pendingVideo of pendingVideos) {
    try {
      console.log(`🔵 Pending API: Processing pending video ${pendingVideo.id} (${pendingVideo.falRequestId})`);
      
      // Check status with fal.queue using the correct video generation model
      const status = await fal.queue.status("fal-ai/minimax/hailuo-02/standard/image-to-video", {
        requestId: pendingVideo.falRequestId,
        logs: true,
      });
      
      console.log(`🔵 Pending API: Status for ${pendingVideo.falRequestId}:`, status);
      
      if (status.status === 'COMPLETED') {
        console.log(`🔵 Pending API: Video ${pendingVideo.id} completed, fetching result...`);
        
        // Get the result
        const result = await fal.queue.result("fal-ai/minimax/hailuo-02/standard/image-to-video", {
          requestId: pendingVideo.falRequestId,
        });
        
        console.log(`🔵 Pending API: Result for ${pendingVideo.id}:`, result);
        
        if (result.video && result.video.url) {
          try {
            // Download and pin the video to IPFS
            const videoBuffer = await downloadFile(result.video.url);
            const videoIpfs = await pinFileToIPFS(videoBuffer, 'generated-video.mp4');
            
            console.log(`🔵 Pending API: Video pinned to IPFS: ${videoIpfs}`);
            
            // Create the appropriate video/remix based on type
            let video;
            
            switch (pendingVideo.type) {
              case 'daily-remix':
                // For daily remix, we need to get the daily prompt
                // This is a bit complex, we might need to store promptId in pending video
                // For now, let's create a custom remix
                ({ video } = await createCustomRemix({
                  userId: pendingVideo.userId,
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
            
            console.log(`🔵 Pending API: Created video ${video.id} for pending video ${pendingVideo.id}`);
            
            // Mark as completed and delete pending video
            await updatePendingVideoStatus({
              id: pendingVideo.id,
              status: 'completed',
            });
            
            await deletePendingVideo(pendingVideo.id);
            
            console.log(`🔵 Pending API: Successfully processed pending video ${pendingVideo.id}`);
            processedCount++;
          } catch (processingError) {
            console.error(`🔴 Pending API: Error processing completed video ${pendingVideo.id}:`, processingError);
            
            // Mark as failed but don't throw - let the API call succeed
            await updatePendingVideoStatus({
              id: pendingVideo.id,
              status: 'failed',
              errorMessage: processingError instanceof Error ? processingError.message : 'Processing failed',
            });
            
            errorCount++;
          }
        } else {
          console.error(`🔴 Pending API: No video in result for ${pendingVideo.id}:`, result);
          
          // Mark as failed but don't throw - let the API call succeed
          await updatePendingVideoStatus({
            id: pendingVideo.id,
            status: 'failed',
            errorMessage: 'No video generated in result',
          });

          errorCount++;
        }
        
      } else if (status.status === 'FAILED' || status.status === 'failed') {
        console.error(`🔴 Pending API: Video ${pendingVideo.id} failed:`, status);
        
        await updatePendingVideoStatus({
          id: pendingVideo.id,
          status: 'failed',
          errorMessage: status.error || 'Unknown error',
        });
        
        errorCount++;
        
      } else if (status.status === 'PENDING' || status.status === 'pending' || 
                 status.status === 'IN_PROGRESS' || status.status === 'processing') {
        console.log(`🔵 Pending API: Video ${pendingVideo.id} still ${status.status}`);
        // Update status to processing if it was pending
        if (status.status === 'IN_PROGRESS' || status.status === 'processing') {
          await updatePendingVideoStatus({
            id: pendingVideo.id,
            status: 'processing',
          });
        }
      }
      
    } catch (error) {
      console.error(`🔴 Pending API: Error processing pending video ${pendingVideo.id}:`, error);
      
      // Try to update status but don't let this error break the entire process
      try {
        await updatePendingVideoStatus({
          id: pendingVideo.id,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (updateError) {
        console.error(`🔴 Pending API: Failed to update status for ${pendingVideo.id}:`, updateError);
      }
      
      errorCount++;
    }
  }
  
  console.log(`🔵 Pending API: Completed processing. Processed: ${processedCount}, Errors: ${errorCount}`);
  
  return {
    processed: processedCount,
    errors: errorCount,
  };
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
    const user = await getUser(walletAddress);
    if (!user) {
      return NextResponse.json({ success: true, pendingVideos: [] });
    }

    // Get only this user's pending videos
    const userPendingVideos = await getPendingVideos(user.id);

    // Process any pending videos that are ready
    let processingResult = { processed: 0, errors: 0 };
    try {
      processingResult = await processPendingVideos(userPendingVideos);
    } catch (processingError) {
      console.error('🔴 Pending API: Error in processPendingVideos:', processingError);
      // Don't let processing errors break the API call
    }

    // Get fresh pending videos after processing
    const freshPendingVideos = await getPendingVideos(user.id);

    return NextResponse.json({
      success: true,
      pendingVideos: freshPendingVideos,
      processingResult,
    });

  } catch (error) {
    console.error('🔴 Pending API: Error fetching pending videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending videos' },
      { status: 500 }
    );
  }
} 