import { NextResponse } from 'next/server';
import { recordNftMetadata } from '@/lib/db';

/**
 * POST /api/nft-metadata
 * Records metadata for a newly minted NFT
 * 
 * Request body:
 * {
 *   tokenId: number,           // Token ID
 *   purchasePriceHigher: number, // Price paid in HIGHER tokens
 *   ownerAddress: string,      // Owner's wallet address
 *   paymentTx: string,         // Payment transaction hash
 *   mintTx: string,            // Mint transaction hash
 * }
 */
export async function POST(request) {
  try {
    const { 
      tokenId, 
      purchasePriceHigher,
      ownerAddress, 
      paymentTx, 
      mintTx 
    } = await request.json();
    
    // Validate required fields
    if (!tokenId || !purchasePriceHigher || !ownerAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Determine the image URL based on the token ID (1-5)
    // Different images for each position in the collection
    const position = Math.min(tokenId, 5);
    const imageUrl = `/images/gift-card-${position}.png`;
    
    // Fixed face value USD for all gift cards
    const faceValueUsd = 25;
    
    // Record the NFT metadata
    await recordNftMetadata(
      tokenId,
      purchasePriceHigher,
      faceValueUsd,
      imageUrl,
      ownerAddress,
      paymentTx,
      mintTx
    );
    
    return NextResponse.json({ 
      success: true,
      tokenId,
      imageUrl
    });
  } catch (error) {
    console.error('Error recording NFT metadata:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to record metadata' 
    }, { status: 500 });
  }
} 