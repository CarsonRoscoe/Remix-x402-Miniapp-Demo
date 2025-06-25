interface ShareOnFarcasterProps {
  videoUrl: string;
  className?: string;
}

export function ShareOnFarcaster({ videoUrl, className = "" }: ShareOnFarcasterProps) {
  const handleShare = () => {
    const text = encodeURIComponent("Check out my AI remix video! 🎬 Made with Remix Mini App.\n" + videoUrl);
    const url = `https://warpcast.com/~/compose?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${className}`}
    >
      <span>📱 Share on Farcaster</span>
    </button>
  );
} 