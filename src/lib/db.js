import { sql } from '@vercel/postgres';

async function ensureGiftCardTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS higher_gift_cards (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      payment_tx TEXT,
      mint_tx TEXT,
      token_id TEXT,
      fid TEXT,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function ensureNftMetadataTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS higher_gift_card_nfts (
      token_id INTEGER PRIMARY KEY,
      purchase_price_higher NUMERIC NOT NULL,
      face_value_usd NUMERIC NOT NULL DEFAULT 25,
      image_url TEXT NOT NULL,
      owner_address TEXT NOT NULL,
      payment_tx TEXT,
      mint_tx TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function ensureTables() {
  await ensureGiftCardTable();
  await ensureNftMetadataTable();
}

/**
 * Get total number of purchases
 * @returns {Promise<number>} count of purchases
 */
export async function getPurchaseCount() {
  await ensureTables();
  const { rows } = await sql`SELECT COUNT(*) AS count FROM higher_gift_cards`;
  return parseInt(rows[0].count, 10);
}

/**
 * Get the next available token ID
 * @returns {Promise<number>} The next available token ID
 */
export async function getNextTokenId() {
  await ensureTables();
  const { rows } = await sql`
    SELECT COALESCE(MAX(CAST(token_id AS INTEGER)), 0) + 1 AS next_id 
    FROM higher_gift_card_nfts
  `;
  return parseInt(rows[0].next_id, 10);
}

/**
 * Record a new purchase
 * @param {string} walletAddress - purchaser's wallet address
 * @param {string} paymentTx - payment transaction hash
 * @param {string} mintTx - minting transaction hash
 * @param {string} tokenId - NFT token ID
 * @param {string} fid - Farcaster user ID
 * @param {string} email - Customer's email address for gift card delivery
 */
export async function recordPurchase(walletAddress, paymentTx, mintTx, tokenId, fid, email) {
  await ensureTables();
  await sql`
    INSERT INTO higher_gift_cards(wallet_address, payment_tx, mint_tx, token_id, fid, email)
    VALUES (${walletAddress}, ${paymentTx}, ${mintTx}, ${tokenId}, ${fid}, ${email})
  `;
}

/**
 * Record NFT metadata
 * @param {number} tokenId - Token ID
 * @param {number} purchasePriceHigher - Price paid in HIGHER tokens
 * @param {number} faceValueUsd - Face value in USD (default 25)
 * @param {string} imageUrl - URL to the NFT image
 * @param {string} ownerAddress - Owner's wallet address
 * @param {string} paymentTx - Payment transaction hash
 * @param {string} mintTx - Mint transaction hash
 */
export async function recordNftMetadata(
  tokenId, 
  purchasePriceHigher, 
  faceValueUsd, 
  imageUrl, 
  ownerAddress, 
  paymentTx, 
  mintTx
) {
  await ensureTables();
  await sql`
    INSERT INTO higher_gift_card_nfts(
      token_id, 
      purchase_price_higher, 
      face_value_usd, 
      image_url, 
      owner_address, 
      payment_tx, 
      mint_tx
    )
    VALUES (
      ${tokenId}, 
      ${purchasePriceHigher}, 
      ${faceValueUsd}, 
      ${imageUrl}, 
      ${ownerAddress}, 
      ${paymentTx}, 
      ${mintTx}
    )
    ON CONFLICT (token_id) 
    DO UPDATE SET
      purchase_price_higher = EXCLUDED.purchase_price_higher,
      face_value_usd = EXCLUDED.face_value_usd,
      image_url = EXCLUDED.image_url,
      owner_address = EXCLUDED.owner_address,
      payment_tx = EXCLUDED.payment_tx,
      mint_tx = EXCLUDED.mint_tx
  `;
}

/**
 * Get NFT metadata by token ID
 * @param {number} tokenId - Token ID
 * @returns {Promise<Object|null>} NFT metadata or null if not found
 */
export async function getNftMetadata(tokenId) {
  await ensureTables();
  const { rows } = await sql`
    SELECT * FROM higher_gift_card_nfts
    WHERE token_id = ${tokenId}
  `;
  
  return rows.length > 0 ? rows[0] : null;
}