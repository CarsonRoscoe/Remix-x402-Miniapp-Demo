import { DailyPrompt, PendingVideo, PrismaClient  } from '../generated/prisma';
import { getAddress } from 'viem';

// Initialize Prisma client with explicit connection string
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection state management
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

// Ensure database is connected before any operation
async function ensureConnected(): Promise<void> {
  if (isConnected) {
    return;
  }

  if (connectionPromise) {
    // If a connection is already in progress, wait for it
    await connectionPromise;
    return;
  }

  // Start connection process
  connectionPromise = prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully');
      isConnected = true;
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error);
      isConnected = false;
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  await connectionPromise;
}

// Create a Daily Remix (video + remix row, linked to daily prompt)
export async function createDailyRemix({
  userId,
  promptId,
  videoIpfs,
  videoUrl,
}: {
  userId: string;
  promptId: string;
  videoIpfs: string;
  videoUrl?: string;
}) {
  await ensureConnected();
  
  // 1. Create video
  const video = await prisma.video.create({
    data: {
      userId,
      videoIpfs,
      videoUrl,
      type: 'daily',
    },
  });
  // 2. Create remix
  const remix = await prisma.remix.create({
    data: {
      videoId: video.id,
      promptId,
      isMinted: false,
    },
  });
  return { video, remix };
}

// Create a Custom Remix (video + remix row, promptId is null)
export async function createCustomRemix({
  userId,
  videoIpfs,
  videoUrl,
}: {
  userId: string;
  videoIpfs: string;
  videoUrl?: string;
}) {
  await ensureConnected();
  
  // 1. Create video
  const video = await prisma.video.create({
    data: {
      userId,
      videoIpfs,
      videoUrl,
      type: 'custom_remix',
    },
  });
  // 2. Create remix (no promptId)
  const remix = await prisma.remix.create({
    data: {
      videoId: video.id,
      isMinted: false,
    },
  });
  return { video, remix };
}

// Create a Custom Video (video only, no remix row)
export async function createCustomVideo({
  userId,
  videoIpfs,
  videoUrl,
}: {
  userId: string;
  videoIpfs: string;
  videoUrl?: string;
}) {
  await ensureConnected();
  
  const video = await prisma.video.create({
    data: {
      userId,
      videoIpfs,
      videoUrl,
      type: 'custom_video',
    },
  });
  return video;
}

// Get all remixes for a user (both minted and unminted)
export async function getRemixes(userId: string) {
  await ensureConnected();
  
  return prisma.remix.findMany({
    where: {
      video: { userId },
    },
    include: {
      video: true,
      prompt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Get all videos for a user (all videos, with optional remix info)
export async function getVideos(userId: string) {
  await ensureConnected();
  
  return prisma.video.findMany({
    where: { userId },
    include: {
      remix: { include: { prompt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Get a user by wallet address
export async function getUser(walletAddress: string) {
  await ensureConnected();
  
  return prisma.user.findUnique({
    where: { walletAddress: getAddress(walletAddress) },
  });
}


export async function getDailyPrompt(): Promise<DailyPrompt> {
  await ensureConnected();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Try to find today's prompt
  let prompt = await prisma.dailyPrompt.findFirst({
    where: { date: today },
    orderBy: { date: 'desc' },
  });

  if (prompt) return prompt;

  // 2. Fallback: get the most recent prompt not in the future
  prompt = await prisma.dailyPrompt.findFirst({
    where: { date: { lte: today } },
    orderBy: { date: 'desc' },
  });

  // 3. Fallback: return null if nothing in DB - this will be handled by the calling code
  if (!prompt) {
    throw new Error('No daily prompts found in database. Please add some prompts first.');
  }

  return prompt;
}

// Create a new daily prompt for a specific date
export async function createNewDailyPrompt({
  date,
  prompt,
}: {
  date: Date;
  prompt: string;
}): Promise<DailyPrompt> {
  await ensureConnected();
  
  // Normalize the date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  
  // Check if a prompt already exists for this date
  const existingPrompt = await prisma.dailyPrompt.findUnique({
    where: { date: normalizedDate },
  });
  
  if (existingPrompt) {
    throw new Error(`A daily prompt already exists for ${normalizedDate.toISOString().split('T')[0]}`);
  }
  
  return prisma.dailyPrompt.create({
    data: {
      date: normalizedDate,
      prompt,
    },
  });
}

// Get all daily prompts (for admin purposes)
export async function getAllDailyPrompts(): Promise<DailyPrompt[]> {
  await ensureConnected();
  
  return prisma.dailyPrompt.findMany({
    orderBy: { date: 'desc' },
  });
}

// Ensure a user exists in the database
export async function getOrUpdateUser({
  walletAddress,
  farcasterId,
}: {
  walletAddress: string
  farcasterId?: number
}) {
  await ensureConnected();
  
  let user = await getUser(walletAddress);
  if (!user) {
    user = await prisma.user.create({
      data: { walletAddress: getAddress(walletAddress), farcasterId },
    });
  }

  if (farcasterId && !user.farcasterId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { farcasterId },
    });
  }

  return user;
}

// Update a remix with Zora coin data and mark as minted
export async function updateCustomRemix(
  remixId: string,
  zoraCoinData: {
    name: string;
    symbol: string;
    uri: string;
    payoutRecipient: string;
    chainId: string;
    currency: string;
    owner: string;
    txHash: string;
    contractAddress: string;
  }
) {
  await ensureConnected();
  
  return prisma.remix.update({
    where: { id: remixId },
    data: {
      isMinted: true,
      contractAddress: zoraCoinData.contractAddress,
      zoraCoinData,
    },
  });
}

// Get all active notification tokens
export async function getNotificationTokens() {
  await ensureConnected();
  
  return prisma.notificationToken.findMany({
    where: {
      isActive: true,
    },
  });
}

// Get notification token by Farcaster ID
export async function getNotificationTokenByFid(fid: number) {
  await ensureConnected();
  
  return prisma.notificationToken.findUnique({
    where: {
      fid: fid,
    },
  });
}

// Update multiple notification tokens (mark as inactive)
export async function updateManyNotificationTokens(tokenList: string[]) {
  await ensureConnected();
  
  if (tokenList.length === 0) {
    return { count: 0 };
  }
  
  return prisma.notificationToken.updateMany({
    where: {
      token: {
        in: tokenList,
      },
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

// Upsert notification token (create or update)
export async function upsertNotificationToken({
  fid,
  token,
  url,
  isActive = true,
}: {
  fid: number;
  token: string;
  url: string;
  isActive?: boolean;
}) {
  await ensureConnected();
  
  return prisma.notificationToken.upsert({
    where: {
      fid: fid,
    },
    update: {
      token,
      url,
      isActive,
      updatedAt: new Date(),
    },
    create: {
      fid,
      token,
      url,
      isActive,
    },
  });
}

// Update notification tokens by FID (mark as inactive)
export async function updateNotificationTokensByFid(fid: number, isActive: boolean = false) {
  await ensureConnected();
  
  return prisma.notificationToken.updateMany({
    where: {
      fid: fid,
    },
    data: {
      isActive,
      updatedAt: new Date(),
    },
  });
}

// Pending Video Functions
export async function createPendingVideo({
  userId,
  type,
  prompt,
  falRequestId,
}: {
  userId: string;
  type: string;
  prompt?: string;
  falRequestId: string;
}) {
  await ensureConnected();
  
  return prisma.pendingVideo.create({
    data: {
      userId,
      type,
      prompt,
      falRequestId,
      status: 'pending',
    },
  });
}

export async function updatePendingVideoStatus({
  id,
  status,
  errorMessage,
}: {
  id: string;
  status: string;
  errorMessage?: string;
}) {
  await ensureConnected();
  
  const updateData: Partial<PendingVideo> = {
    status,
    updatedAt: new Date(),
  };
  
  if (status === 'completed') {
    updateData.completedAt = new Date();
  }
  
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  
  return prisma.pendingVideo.update({
    where: { id },
    data: updateData,
  });
}

export async function getPendingVideos(userId?: string) {
  await ensureConnected();
  
  const whereClause = userId ? { userId } : {};
  
  return prisma.pendingVideo.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });
}

export async function deletePendingVideo(id: string) {
  await ensureConnected();
  
  return prisma.pendingVideo.delete({
    where: { id },
  });
}