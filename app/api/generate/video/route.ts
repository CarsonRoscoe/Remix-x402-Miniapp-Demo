import { NextRequest, NextResponse } from "next/server";
import { createPendingVideo, getOrUpdateUser } from "../../db";
import { queueVideoGeneration, getPaymentDetails } from "../../utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, walletAddress } = body;

    if (!prompt || !imageUrl || !walletAddress) {
      return NextResponse.json(
        { error: "prompt, imageUrl, and walletAddress are required" },
        { status: 400 },
      );
    }

    const user = await getOrUpdateUser({ walletAddress });
    const paymentDetails = getPaymentDetails(request);

    const { queueResult } = await queueVideoGeneration({
      prompt,
      imageUrl,
      type: "custom-video",
    });

    const pendingVideo = await createPendingVideo({
      userId: user.id,
      type: "custom-video",
      prompt,
      falRequestId: queueResult.request_id,
      paymentPayload: paymentDetails.paymentPayload,
      paymentRequirements: paymentDetails.paymentRequirements,
    });

    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    return NextResponse.json({
      success: true,
      pendingVideoId: pendingVideo.id,
      url: `${baseUrl}/video/${pendingVideo.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate video",
      },
      { status: 500 },
    );
  }
}
