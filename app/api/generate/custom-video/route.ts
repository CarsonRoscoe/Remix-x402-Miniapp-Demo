import { NextRequest, NextResponse } from 'next/server';
import { generateAIVideo } from '../../utils';
import { downloadFile, pinFileToIPFS } from '../../ipfs';
import { createCustomVideo, getOrUpdateUser } from '../../db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, walletAddress, imageUrl } = body;
    
    if (!prompt || !walletAddress) {
      return NextResponse.json(
        { error: 'Custom prompt and wallet address are required' },
        { status: 400 }
      );
    }
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required for custom video generation' },
        { status: 400 }
      );
    }
    
    // Generate AI video by remixing the provided image
    const generatedVideoUrl = await generateAIVideo(prompt, imageUrl);

    const file = await downloadFile(generatedVideoUrl);
    const videoIpfs = await pinFileToIPFS(file, 'custom-video.mp4');

    const user = await getOrUpdateUser({ walletAddress });

    const video = await createCustomVideo({
      userId: user.id,
      videoIpfs,
      videoUrl: generatedVideoUrl,
    })
    
    return NextResponse.json({
      videoId: video.id,
      success: true,
      videoUrl: generatedVideoUrl,
      ipfsUrl: videoIpfs,
      imageUrl: imageUrl,
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