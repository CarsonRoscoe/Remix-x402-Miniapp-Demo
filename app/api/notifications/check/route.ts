import { NextRequest, NextResponse } from 'next/server';
import { getNotificationTokenByFid } from '../../db';

export async function POST(request: NextRequest) {
  try {
    const { farcasterId } = await request.json();
    
    if (!farcasterId) {
      return NextResponse.json({ error: 'Farcaster ID is required' }, { status: 400 });
    }
    
    // Check if user has an active notification token
    const notificationToken = await getNotificationTokenByFid(farcasterId);
    
    return NextResponse.json({
      success: true,
      isEnrolled: !!notificationToken?.isActive,
      hasToken: !!notificationToken,
    });
  } catch (error) {
    console.error('Error checking notification enrollment:', error);
    return NextResponse.json({ error: 'Failed to check notification enrollment' }, { status: 500 });
  }
} 