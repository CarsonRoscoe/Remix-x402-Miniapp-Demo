# AI Image Generator Mini App

A Coinbase Wallet Mini App that generates AI images with x402 payment integration. Users can generate images using daily prompts or custom prompts, with payments processed through the x402 protocol.

## Features

- 🎨 **Daily Prompt Generation**: Generate images with curated daily prompts ($0.05 USDC)
- ✨ **Custom Prompt Generation**: Create images with your own prompts ($0.10 USDC)
- 👤 **Profile Integration**: Remix prompts with your Farcaster profile picture
- 💳 **x402 Payments**: Seamless payment processing on Base network
- 🪙 **Zora Integration**: Mint generated images as NFTs
- 📱 **Farcaster Sharing**: Share your creations on Farcaster
- 🔗 **Wallet Integration**: Connect with Coinbase Wallet

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: OnchainKit, Coinbase Wallet
- **Payments**: x402 protocol
- **Blockchain**: Base network (mainnet & testnet)
- **AI**: Veo 3 (planned), placeholder implementation
- **Social**: Farcaster API (Neynar)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Coinbase Wallet
- Farcaster account
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

5. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

6. Open [http://localhost:3000](http://localhost:3000) with your browser

## Environment Setup

Copy `env.example` to `.env.local` and configure the following variables:

### Required Variables

```bash
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=AI Image Generator Mini App

# x402 Payment Configuration
PUBLIC_RESOURCE_WALLET_ADDRESS=0x0000000000000000000000000000000000000000
PUBLIC_NETWORK=base-sepolia

# Farcaster API Configuration
NEXT_PUBLIC_NEYNAR_API_KEY=your_neynar_api_key_here
NEYNAR_API_KEY=your_neynar_api_key_here
```

### Getting API Keys

1. **OnchainKit API Key**: Get from [OnchainKit](https://onchainkit.xyz)
2. **Neynar API Key**: Get from [Neynar](https://neynar.com)
3. **Resource Wallet Address**: Your wallet address to receive payments
4. **Network**: Use `base-sepolia` for testing, `base` for production

## Usage

### For Users

1. **Connect Wallet**: Click the wallet button in the top-right corner
2. **Choose Generation Type**:
   - **Prompt of the Day**: Click the blue button for curated prompts ($0.05 USDC)
   - **Custom Prompt**: Click the purple button to enter your own prompt ($0.10 USDC)
3. **Payment**: Complete the x402 payment flow
4. **Generate**: Wait for AI image generation
5. **Share**: Coin on Zora or share on Farcaster

### For Developers

#### Project Structure

```
app/
├── api/
│   ├── generate-daily/     # Daily prompt generation API
│   └── generate-custom/    # Custom prompt generation API
├── utils/
│   └── farcaster.ts        # Farcaster API utilities
├── svg/                    # SVG components
├── page.tsx               # Main Mini App interface
├── layout.tsx             # App layout
└── providers.tsx          # Wallet providers
```

#### Key Components

- **x402 Middleware**: Protects API routes with payment requirements
- **Farcaster Integration**: Fetches user profiles and IDs
- **AI Generation**: Placeholder for Veo 3 integration
- **Wallet Connection**: OnchainKit wallet integration

#### Customization

1. **Daily Prompts**: Update the `getDailyPrompt()` function in `/api/generate-daily/route.ts`
2. **AI Model**: Replace placeholder in `generateAIImage()` functions
3. **Styling**: Modify Tailwind classes in `app/page.tsx`
4. **Payment Amounts**: Update prices in `middleware.ts`

## Development

### Adding AI Model Integration

Replace the placeholder `generateAIImage()` function in both API routes:

```typescript
async function generateAIImage(prompt: string, profileImageUrl?: string): Promise<string> {
  // Integrate with Veo 3, Replicate, or other AI services
  const response = await fetch('https://api.veo3.com/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VEO3_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      reference_image: profileImageUrl,
      // other parameters
    }),
  });
  
  const data = await response.json();
  return data.image_url;
}
```

### Testing

1. **Local Development**: Use Base Sepolia testnet
2. **Payment Testing**: Ensure you have test USDC on Sepolia
3. **Farcaster Testing**: Use a wallet with a linked Farcaster account

## Deployment

1. **Build the app**:
```bash
npm run build
```

2. **Deploy to your preferred platform** (Vercel, Netlify, etc.)

3. **Configure production environment variables**

4. **Update network to `base` for mainnet**

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
