import { NextRequest, NextResponse } from 'next/server';
import { getPendingVideos, updatePendingVideoStatus, deletePendingVideo, createDailyRemix, createCustomRemix, createCustomVideo, getOrUpdateUser } from '../db';
import { downloadFile, pinFileToIPFS } from '../ipfs';
import { getFarcasterProfile } from '../utils';

// Initialize fal
const fal = require('@fal-ai/serverless-client');
fal.config({
  credentials: process.env.FAL_KEY,
});

async function processPendingVideos() {
  console.log('🔵 Worker: Starting background processing...');
  
  // Get all pending videos
  const pendingVideos = await getPendingVideos(); // Get all users' pending videos
  
  console.log(`🔵 Worker: Found ${pendingVideos.length} pending videos`);
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const pendingVideo of pendingVideos) {
    try {
      console.log(`🔵 Worker: Processing pending video ${pendingVideo.id} (${pendingVideo.falRequestId})`);
      
      // Check status with fal.queue using the correct video generation model
      const status = await fal.queue.status("fal-ai/minimax/hailuo-02/standard/image-to-video", {
        requestId: pendingVideo.falRequestId,
        logs: true,
      });
      
      console.log(`🔵 Worker: Status for ${pendingVideo.falRequestId}:`, status);
      
      if (status.status === 'COMPLETED') {
        console.log(`🔵 Worker: Video ${pendingVideo.id} completed, fetching result...`);
        
        // Get the result
        const result = await fal.queue.result("fal-ai/minimax/hailuo-02/standard/image-to-video", {
          requestId: pendingVideo.falRequestId,
        });
        
        console.log(`🔵 Worker: Result for ${pendingVideo.id}:`, result);
        
        if (result.video && result.video.url) {
          // Download and pin the video to IPFS
          const videoBuffer = await downloadFile(result.video.url);
          const videoIpfs = await pinFileToIPFS(videoBuffer, 'generated-video.mp4');
          
          console.log(`🔵 Worker: Video pinned to IPFS: ${videoIpfs}`);
          
          // Create the appropriate video/remix based on type
          let video, remix;
          
          switch (pendingVideo.type) {
            case 'daily-remix':
              // For daily remix, we need to get the daily prompt
              // This is a bit complex, we might need to store promptId in pending video
              // For now, let's create a custom remix
              ({ video, remix } = await createCustomRemix({
                userId: pendingVideo.userId,
                videoIpfs,
                videoUrl: result.video.url,
              }));
              break;
              
            case 'custom-remix':
              ({ video, remix } = await createCustomRemix({
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
          
          console.log(`🔵 Worker: Created video ${video.id} for pending video ${pendingVideo.id}`);
          
          // Mark as completed and delete pending video
          await updatePendingVideoStatus({
            id: pendingVideo.id,
            status: 'completed',
          });
          
          await deletePendingVideo(pendingVideo.id);
          
          console.log(`🔵 Worker: Successfully processed pending video ${pendingVideo.id}`);
          processedCount++;
        } else {
          throw new Error('No video in result');
        }
        
      } else if (status.status === 'FAILED' || status.status === 'failed') {
        console.error(`🔴 Worker: Video ${pendingVideo.id} failed:`, status);
        
        await updatePendingVideoStatus({
          id: pendingVideo.id,
          status: 'failed',
          errorMessage: status.error || 'Unknown error',
        });
        
        errorCount++;
        
      } else if (status.status === 'PENDING' || status.status === 'pending' || 
                 status.status === 'IN_PROGRESS' || status.status === 'processing') {
        console.log(`🔵 Worker: Video ${pendingVideo.id} still ${status.status}`);
        // Update status to processing if it was pending
        if (status.status === 'IN_PROGRESS' || status.status === 'processing') {
          await updatePendingVideoStatus({
            id: pendingVideo.id,
            status: 'processing',
          });
        }
      }
      
    } catch (error) {
      console.error(`🔴 Worker: Error processing pending video ${pendingVideo.id}:`, error);
      
      await updatePendingVideoStatus({
        id: pendingVideo.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      errorCount++;
    }
  }
  
  console.log(`🔵 Worker: Completed processing. Processed: ${processedCount}, Errors: ${errorCount}`);
  
  return {
    success: true,
    processed: processedCount,
    errors: errorCount,
    total: pendingVideos.length
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Worker: GET request received (cron job)');
    const result = await processPendingVideos();
    return NextResponse.json(result);
  } catch (error) {
    console.error('🔴 Worker: Unexpected error in GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Worker: POST request received (manual trigger)');
    const result = await processPendingVideos();
    return NextResponse.json(result);
  } catch (error) {
    console.error('🔴 Worker: Unexpected error in POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 