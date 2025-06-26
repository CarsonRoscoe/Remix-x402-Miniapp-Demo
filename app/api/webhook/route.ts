import { NextRequest, NextResponse } from 'next/server';
import { upsertNotificationToken, updateNotificationTokensByFid } from '../db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Webhook event received:', body);
    
    // For now, we'll handle the webhook events manually
    // In production, you should use the @farcaster/frame-node library for verification
    
    const { event, fid, notificationDetails } = body;
    
    if (event === 'frame_added' && notificationDetails) {
      // User added the app and notifications are enabled
      await upsertNotificationToken({
        fid: fid,
        token: notificationDetails.token,
        url: notificationDetails.url,
        isActive: true,
      });
      console.log(`Notification token saved for FID ${fid}`);
    } else if (event === 'frame_removed') {
      // User removed the app - mark tokens as inactive
      await updateNotificationTokensByFid(fid, false);
      console.log(`App removed for FID ${fid}`);
    } else if (event === 'notifications_disabled') {
      // User disabled notifications - mark tokens as inactive
      await updateNotificationTokensByFid(fid, false);
      console.log(`Notifications disabled for FID ${fid}`);
    } else if (event === 'notifications_enabled' && notificationDetails) {
      // User re-enabled notifications
      await upsertNotificationToken({
        fid: fid,
        token: notificationDetails.token,
        url: notificationDetails.url,
        isActive: true,
      });
      console.log(`Notifications re-enabled for FID ${fid}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
} 