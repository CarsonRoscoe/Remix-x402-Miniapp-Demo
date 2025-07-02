import { NextRequest, NextResponse } from 'next/server';
import { getPendingVideos, getUser } from '../db';

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

    return NextResponse.json({
      success: true,
      pendingVideos: userPendingVideos,
    });

  } catch (error) {
    console.error('🔴 Pending API: Error fetching pending videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending videos' },
      { status: 500 }
    );
  }
} 