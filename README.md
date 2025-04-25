yarn dev
 # EREW-$HIGHER Gift Card

 Minimalist Next.js (vanilla JavaScript) app to mint Erewhon gift card NFTs.

 ## Features

 - Single-page UI styled in black/brown, clean typography.
 - Mint via Farcaster Frame on Base Mainnet.
 - Share your mint with a button.
 - Track purchase count (max 5) in NeonDB/Postgres.
 - Configurable pricing schedule per purchase.
 - Mobile-friendly (<480px) in Farcaster Frame.

 ## Setup

 Requirements:
 - Node.js 14+
 - PostgreSQL (NeonDB) for tracking purchases.

 Environment Variables (in `.env.local`):
 - `DATABASE_URL` – Postgres connection string.
 - `NEXT_PUBLIC_CONTRACT_ADDRESS` – NFT contract address.
 - `NEXT_PUBLIC_APP_URL` – Public URL for Frame metadata.

 Install dependencies:
 ```bash
 npm install
 npm install @farcaster/frame-sdk
 ```

 Run development server:
 ```bash
 npm run dev
 ```

 Visit http://localhost:3000.

 ## Database

 The app auto-creates a `purchases` table. To inspect or reset:
 ```sql
 CREATE TABLE IF NOT EXISTS purchases (
   id SERIAL PRIMARY KEY,
   wallet_address TEXT NOT NULL,
   tx_hash TEXT NOT NULL,
   created_at TIMESTAMP DEFAULT NOW()
 );
 ```

 ## Configuration

 - In `src/app/main-page.js`, fill in:
   - `PRICE_SCHEDULE` (hex Wei values per purchase).
   - `MINT_CALL_DATA` (encoded mint function call data).
 - Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`.
 - (Optional) Set `NEXT_PUBLIC_APP_URL` for Frame button metadata.

 ## Disclaimer
 Not in any way affiliated with Erewhon; this is a fan-made gift card builder.
