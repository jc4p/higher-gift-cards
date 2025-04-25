import { sql } from '@vercel/postgres';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS higher_gift_cards (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      fid TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

/**
 * Get total number of purchases
 * @returns {Promise<number>} count of purchases
 */
export async function getPurchaseCount() {
  await ensureTable();
  const { rows } = await sql`SELECT COUNT(*) AS count FROM higher_gift_cards`;
  return parseInt(rows[0].count, 10);
}

/**
 * Record a new purchase
 * @param {string} walletAddress - purchaser's wallet address
 * @param {string} txHash - transaction hash
 * @param {string} fid - Farcaster user ID
 */
export async function recordPurchase(walletAddress, txHash, fid) {
  await ensureTable();
  await sql`
    INSERT INTO higher_gift_cards(wallet_address, tx_hash, fid)
    VALUES (${walletAddress}, ${txHash}, ${fid})
  `;
}