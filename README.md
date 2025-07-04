# AI Video Generator Mini App

A Coinbase Wallet Mini App that generates AI videos with x402 payment integration. Users can create videos using daily prompts, custom prompts, or pure text-to-video generation, with payments processed through the x402 protocol.

## Features

- 🎬 **Daily Remix Videos**: Generate videos with curated daily prompts and your Farcaster profile picture ($0.50 USDC)
- ✨ **Custom Remix Videos**: Create videos with your own prompts and Farcaster profile picture ($1.00 USDC)
- 🎥 **Custom Videos**: Pure text-to-video generation without profile integration ($2.00 USDC)
- 👤 **Farcaster Integration**: Automatically uses your Farcaster profile picture for remix videos
- 💳 **x402 Payments**: Seamless payment processing on Base network
- 🪙 **Zora Integration**: Mint generated videos as NFTs with Zora Coins
- 📱 **Farcaster Sharing**: Share your creations directly on Farcaster
- 🔗 **Wallet Integration**: Connect with Coinbase Wallet
- 📚 **Video History**: View all your generated videos with metadata
- 🎯 **Smart Categorization**: Videos are automatically labeled as Daily Remix, Custom Remix, or Custom Video

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: OnchainKit, Coinbase Wallet, Wagmi
- **Payments**: x402 protocol
- **Blockchain**: Base network (mainnet & testnet)
- **AI Video**: FAL AI (text-to-video generation)
- **Social**: Farcaster API (Neynar)
- **NFT Minting**: Zora Coins SDK
- **Storage**: IPFS (Pinata)
- **Database**: PostgreSQL with Prisma ORM

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Coinbase Wallet
- Farcaster account (for remix features)
- API keys (see Environment Setup)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd x402MiniApp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure your environment variables (see Environment Setup below)

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
npm run seed
```

6. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

7. Open [http://localhost:3000](http://localhost:3000) with your browser

## Environment Setup

Copy `env.example` to `.env.local` and configure the following variables:

### Required Variables

```bash
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=AI Video Generator Mini App

# x402 Payment Configuration
PUBLIC_RESOURCE_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
PUBLIC_NETWORK=base-sepolia

# Farcaster API Configuration
NEXT_PUBLIC_NEYNAR_API_KEY=your_neynar_api_key_here
NEYNAR_API_KEY=your_neynar_api_key_here

# FAL AI Configuration
FAL_KEY=your_fal_ai_key_here

# Database Configuration
DATABASE_URL=your_postgresql_database_url_here

# IPFS Configuration (Pinata)
PINATA_JWT=your_pinata_jwt_token_here
```

### Getting API Keys

1. **OnchainKit API Key**: Get from [OnchainKit](https://onchainkit.xyz)
2. **Neynar API Key**: Get from [Neynar](https://neynar.com)
3. **FAL AI Key**: Get from [FAL AI](https://fal.ai)
4. **Pinata JWT**: Get from [Pinata](https://pinata.cloud)
5. **Resource Wallet Address**: Your wallet address to receive payments
6. **Network**: Use `base-sepolia` for testing, `base` for production

## Usage

### For Users

1. **Connect Wallet**: Click the wallet button in the top-right corner
2. **Choose Generation Type**:
   - **Daily Remix**: Click the blue button for curated prompts with your Farcaster profile ($0.50 USDC)
   - **Custom Remix**: Click the purple button to enter your own prompt with your Farcaster profile ($1.00 USDC)
   - **Custom Video**: Click the green button for pure text-to-video generation ($2.00 USDC)
3. **Payment**: Complete the x402 payment flow
4. **Generate**: Wait for AI video generation (may take 1-2 minutes)
5. **View & Share**: 
   - Watch your video in the modal player
   - Mint as NFT on Zora
   - Share on Farcaster (for remixes)
6. **History**: Switch to the History tab to view all your generated videos

### Video Types Explained

- **Daily Remix**: Uses a curated daily prompt + your Farcaster profile picture
- **Custom Remix**: Uses your custom prompt + your Farcaster profile picture  
- **Custom Video**: Uses your custom prompt only (no profile picture)

### For Developers

#### Project Structure

```
app/
├── api/
│   ├── generate/
│   │   ├── daily/          # Daily remix generation API
│   │   ├── custom/         # Custom remix generation API
│   │   └── custom-video/   # Custom video generation API
│   ├── videos/             # Video history API
│   ├── zora/               # Zora minting API
│   └── db.ts               # Database operations
├── components/
│   ├── RemixCard.tsx       # Video display component
│   ├── ZoraCoinButton.tsx  # Zora minting component
│   └── ShareOnFarcaster.tsx # Farcaster sharing component
├── utils/
│   └── farcaster.ts        # Farcaster API utilities
├── svg/                    # SVG components
├── page.tsx               # Main Mini App interface
├── layout.tsx             # App layout
└── providers.tsx          # Wallet providers
```

#### Key Components

- **x402 Middleware**: Protects API routes with payment requirements
- **Farcaster Integration**: Fetches user profiles and IDs for remix videos
- **AI Video Generation**: FAL AI integration for text-to-video
- **IPFS Storage**: Automatic video storage and pinning
- **Zora Minting**: NFT creation with Zora Coins
- **Database**: PostgreSQL with Prisma for video and remix tracking

#### Database Schema

The app uses PostgreSQL with the following main entities:
- **Users**: Wallet addresses and Farcaster IDs
- **Videos**: Generated video metadata and IPFS URLs
- **Remixes**: Video remixes with prompt and Zora metadata
- **Prompts**: Daily prompts for remix generation

## Development

### Adding New AI Models

The app currently uses FAL AI for video generation. To integrate other models, update the functions in `app/utils.ts`:

```typescript
// For text-to-video with profile picture
async function generateAIVideo(prompt: string, profileImageUrl: string): Promise<string> {
  // Integrate with your preferred AI video service
}

// For pure text-to-video
async function generateTextToVideo(prompt: string): Promise<string> {
  // Integrate with your preferred AI video service
}
```

### Customization

1. **Daily Prompts**: Update the prompts in the database using the seed script
2. **Pricing**: Modify prices in `middleware.ts`
3. **Styling**: Modify Tailwind classes in components
4. **Video Processing**: Update video processing logic in `app/utils.ts`

### Testing

1. **Local Development**: Use Base Sepolia testnet
2. **Payment Testing**: Ensure you have test USDC on Sepolia
3. **Farcaster Testing**: Use a wallet with a linked Farcaster account
4. **Video Generation**: Test with FAL AI credits

## Deployment

1. **Build the app**:
```bash
npm run build
```

2. **Deploy to your preferred platform** (Vercel, Netlify, etc.)

3. **Configure production environment variables**

4. **Update network to `base` for mainnet**

5. **Set up production database**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the [OnchainKit documentation](https://onchainkit.xyz)
- Review [x402 documentation](https://docs.base.org/wallet-app/introduction/getting-started)
- Open an issue in this repository
