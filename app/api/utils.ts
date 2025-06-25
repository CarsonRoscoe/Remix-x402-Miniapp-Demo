import { fal } from "@fal-ai/client";

// Function to download and upload image to fal.ai storage
async function uploadImageToFal(imageUrl: string): Promise<string> {
  try {
    console.log('Downloading image from:', imageUrl);
    
    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    console.log('Original content type:', contentType);
    
    // Determine file extension based on content type
    let fileExtension = 'jpg';
    let mimeType = 'image/jpeg';
    
    if (contentType.includes('avif')) {
      fileExtension = 'avif';
      mimeType = 'image/avif';
    } else if (contentType.includes('png')) {
      fileExtension = 'png';
      mimeType = 'image/png';
    } else if (contentType.includes('webp')) {
      fileExtension = 'webp';
      mimeType = 'image/webp';
    } else if (contentType.includes('gif')) {
      fileExtension = 'gif';
      mimeType = 'image/gif';
    }
    
    console.log('Using file extension:', fileExtension, 'with MIME type:', mimeType);
    
    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: mimeType });
    
    // Create a File object for upload with correct extension
    const imageFile = new File([imageBlob], `profile-image.${fileExtension}`, { type: mimeType });
    
    console.log('Uploading image to fal.ai storage...');
    const uploadedUrl = await fal.storage.upload(imageFile);
    console.log('Image uploaded successfully:', uploadedUrl);
    
    if (!uploadedUrl || typeof uploadedUrl !== 'string') {
      throw new Error('Failed to upload image to fal.ai storage');
    }
    
    return uploadedUrl;
  } catch (error) {
    console.error('Error uploading image to fal.ai:', error);
    throw error;
  }
}

// Function to fetch Farcaster profile picture using our API route
export async function getFarcasterProfile(walletAddress: string): Promise<{ farcasterId: number, pfpUrl: string } | undefined> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/farcaster/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });
    
    if (!response.ok) {
      console.error('Failed to fetch Farcaster profile:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('Farcaster API response:', data);
    
    if (data.success && data.user?.pfpUrl) {
      let url = data.user.pfpUrl;
      if (url.includes("/rect")) {
        const parts = url.split("/");
        parts[parts.length - 1] = "original" //"squarecrop3";
        url = parts.join("/");
      }
      return { farcasterId: data.user.fid, pfpUrl: url };
    }
    
    if (!data.success) {
      console.log('Farcaster lookup failed:', data.error, data.debug);
    }
    
    return;
  } catch (error) {
    console.error('Error fetching Farcaster profile:', error);
    return;
  }
}

// Function to generate AI video using Kling 2.1 Master image-to-video
export async function generateAIVideo(prompt: string, profileImageUrl?: string): Promise<string> {
  // Remove special characters from prompt
  prompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '');

  try {
    console.log('Generating AI video with prompt:', prompt);
    console.log('Profile image URL:', profileImageUrl);

    // If no profile image, use a text-to-video approach
    if (!profileImageUrl) {
      console.log('No profile image provided, using text-to-video fallback');
      return await generateTextToVideo(prompt);
    }

    // Upload the profile image to fal.ai storage first
    console.log('Uploading profile image to fal.ai storage...');
    const uploadedImageUrl = await uploadImageToFal(profileImageUrl);
    console.log('Using uploaded image URL:', uploadedImageUrl);

    // Use Kling 2.1 Master for dramatic video transformations
    const result = await fal.subscribe("fal-ai/minimax/hailuo-02/standard/image-to-video", {

      input: {
        prompt: prompt,
        image_url: uploadedImageUrl,
        prompt_optimizer: true,
        // duration: "5",
        // negative_prompt: "blur, distort, and low quality",
        // cfg_scale: 0.5
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('Kling 2.1 Master response:', result.data);

    if (result.data.video && result.data.video.url) {
      return result.data.video.url;
    } else {
      throw new Error('No video generated');
    }

  } catch (error) {
    console.error('Error generating AI video:', error);
    console.error(JSON.stringify((error as any)?.body ?? {}, null, 2));
    // Fallback to placeholder video
    throw new Error('No video generated from image-to-video');
  }
}

// Fallback function for text-to-video when no profile picture is available
export async function generateTextToVideo(prompt: string): Promise<string> {
  try {
    const result = await fal.subscribe("fal-ai/kling-video/v2/master/text-to-video", {
      input: {
        prompt: prompt,
        duration: "5", // 5 second video
        negative_prompt: "blur, distort, low quality, ugly, bad anatomy, cartoon, illustration",
        cfg_scale: 0.8, // Balanced guidance for creative but coherent results
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('Text-to-video response:', result.data);
    
    if (result.data.video && result.data.video.url) {
      return result.data.video.url;
    } else {
      throw new Error('No video generated from text-to-video');
    }

  } catch (error) {
    console.error('Error in text-to-video fallback:', error);
    throw new Error('No video generated from text-to-video');
  }
}

// Enhances a base prompt with consistent remix instructions for video generation.
export function createEnhancedPrompt(prompt: string, profileImageUrl?: string): string {
  const videoInstruction = "Bring this scene to life with subtle, cinematic movement that enhances the magical atmosphere.";
  const remixInstruction = "Completely reimagine the subject's appearance and style while preserving its core essence.";
  
  if (profileImageUrl) {
    return `${prompt} ${remixInstruction} ${videoInstruction}`;
  }
  return `${prompt} ${videoInstruction}`;
}