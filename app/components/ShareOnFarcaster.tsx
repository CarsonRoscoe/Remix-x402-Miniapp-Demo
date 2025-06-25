import { Share2 } from 'lucide-react';

interface ShareOnFarcasterProps {
  videoUrl?: string; // Original video URL (preferred for previews)
  ipfsUrl?: string;  // IPFS URL (fallback)
  className?: string;
  iconOnly?: boolean; // Show only icon instead of text
}

export function ShareOnFarcaster({ videoUrl, ipfsUrl, className = "", iconOnly = false }: ShareOnFarcasterProps) {
  const handleShare = () => {
    // Use videoUrl first (better preview), fallback to IPFS URL
    const shareUrl = videoUrl || ipfsUrl;
    
    if (!shareUrl) {
      console.error('No video URL available for sharing');
      return;
    }

    const text = encodeURIComponent("Check out my AI remix video! 🎬 Made with Remix Mini App.\n" + shareUrl);
    const url = `https://warpcast.com/~/compose?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${className}`}
    >
      {iconOnly ? (
        <Share2 className="w-5 h-5" />
      ) : (
        <span>📱 Share on Farcaster</span>
      )}
    </button>
  );
} 