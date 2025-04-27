import { NextResponse } from 'next/server';
import { verifyHigherTransfer, generateMintSignature } from '@/lib/signer';
import { getNextTokenId } from '@/lib/db';

// Wallet address that should receive the HIGHER tokens
const RECIPIENT_ADDRESS = process.env.HIGHER_RECIPIENT_ADDRESS || '0x0000000000000000000000000000000000000000';

// HIGHER token amounts for each tier - must match the frontend
const PRICE_DATA = [
  { sale: 1, roundedHigher: 4450 },
  { sale: 2, roundedHigher: 8900 },
  { sale: 3, roundedHigher: 17800 },
  { sale: 4, roundedHigher: 35600 },
  { sale: 5, roundedHigher: 71150 },
];

/**
 * Get expected HIGHER amount based on token ID
 * @param {number} tokenId - The token ID to be minted
 * @returns {number} The expected amount of HIGHER tokens
 */
function getExpectedAmount(tokenId) {
  // Array is 0-indexed, but token IDs start at 1
  const index = Math.min(tokenId - 1, PRICE_DATA.length - 1);
  return PRICE_DATA[Math.max(0, index)].roundedHigher;
}

/**
 * POST /api/verify-transfer
 * Verifies a HIGHER token transfer and returns a signature for minting
 * 
 * Request body:
 * {
 *   txHash: string,          // Transaction hash of the HIGHER transfer
 *   walletAddress: string,   // Address of the sender who transferred HIGHER
 * }
 * 
 * Response:
 * {
 *   verified: boolean,       // Whether the transfer was verified
 *   signature: string,       // Signature to use for minting (if verified)
 *   tokenId: number,         // The token ID that will be minted
 *   error?: string,          // Error message if verification failed
 * }
 */
export async function POST(request) {
  try {
    const { txHash, walletAddress, amount: clientAmount } = await request.json();
    
    // Validate required parameters
    if (!txHash || !walletAddress) {
      return NextResponse.json({
        verified: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }
    
    // Determine the token ID based on the next available ID in the NFT table
    const tokenId = await getNextTokenId();
    
    // Calculate the expected HIGHER amount based on token ID
    const expectedAmount = getExpectedAmount(tokenId);
    
    // If client sent an amount, verify it matches our expected amount
    if (clientAmount && Math.abs(clientAmount - expectedAmount) > 1) {
      console.warn(`Client-provided amount (${clientAmount}) doesn't match expected amount (${expectedAmount})`);
    }
    
    console.log(`Verifying HIGHER transfer: ${expectedAmount} tokens from ${walletAddress} to ${RECIPIENT_ADDRESS} (tx: ${txHash})`);
    console.log(`Token ID for this mint will be: ${tokenId}`);
    
    // Verify the transfer using our server-calculated expected amount
    const verified = await verifyHigherTransfer(
      txHash,
      RECIPIENT_ADDRESS,
      expectedAmount,
      walletAddress
    );
    
    if (!verified) {
      return NextResponse.json({
        verified: false,
        error: 'Transaction verification failed',
      }, { status: 400 });
    }
    
    // Generate signature for minting
    const signature = await generateMintSignature(txHash, walletAddress, tokenId);
    
    // Return verification result and signature
    return NextResponse.json({
      verified: true,
      signature,
      tokenId,
      expectedAmount,
    });
  } catch (error) {
    console.error('Error verifying transfer:', error);
    return NextResponse.json({
      verified: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
} 