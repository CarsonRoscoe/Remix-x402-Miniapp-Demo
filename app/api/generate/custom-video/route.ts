import { NextRequest, NextResponse } from 'next/server';
import { generateTextToVideo } from '../../utils';
import { downloadFile, pinFileToIPFS } from '../../ipfs';
import { createCustomVideo, getOrUpdateUser } from '../../db';

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
    
    // Generate AI video without profile picture (pure text-to-video)
    const generatedVideoUrl = await generateTextToVideo(prompt);

    const file = await downloadFile(generatedVideoUrl);
    const videoIpfs = await pinFileToIPFS(file, 'custom-video.mp4');

    const user = await getOrUpdateUser({ walletAddress });

    const video = await createCustomVideo({
      userId: user.id,
      videoIpfs,
    })
    
    return NextResponse.json({
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