import { NextResponse } from 'next/server';
import { recordNftMetadata } from '@/lib/db';

const runtime = 'edge';

/**
 * POST /api/nft-metadata
 * Records metadata for a newly minted NFT and triggers gift card email
 * 
 * Request body:
 * {
 *   tokenId: number,           // Token ID
 *   purchasePriceHigher: number, // Price paid in HIGHER tokens
 *   ownerAddress: string,      // Owner's wallet address
 *   paymentTx: string,         // Payment transaction hash
 *   mintTx: string,            // Mint transaction hash
 *   email: string              // User's email for gift card delivery
 * }
 */
export async function POST(request) {
  let emailSent = false;
  try {
    const { 
      tokenId, 
      purchasePriceHigher,
      ownerAddress, 
      paymentTx, 
      mintTx, 
      email
    } = await request.json();
    
    // Validate required fields
    if (!tokenId || !purchasePriceHigher || !ownerAddress || !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Determine the image URL based on the token ID (1-5)
    // Different images for each position in the collection
    const position = Math.min(tokenId, 5);
    const imageUrl = `https://images.kasra.codes/erewhon-nfts/smoothie-${position}.png`;
    
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
    
    console.log(`NFT metadata recorded for token ${tokenId}`);
    
    // Send the gift card email
    const emailApiUrl = process.env.EMAIL_API_URL;
    const emailApiKey = process.env.EMAIL_API_KEY;
    
    if (emailApiUrl && emailApiKey) {
      console.log(`Sending gift card email to ${email} for token ${tokenId}`);
      const emailResponse = await fetch(`${emailApiUrl}/send-gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-key': emailApiKey
        },
        body: JSON.stringify({
          number: tokenId,
          email: email
        })
      });
      
      if (!emailResponse.ok) {
        console.error('Email API call failed:', await emailResponse.text());
        // Don't fail the whole request, just log the error
        emailSent = false;
      } else {
        console.log('Email API call successful');
        emailSent = true;
      }
    } else {
      console.warn('Email API URL or Key not configured, skipping email send');
    }
    
    return NextResponse.json({ 
      success: true,
      tokenId,
      imageUrl,
      emailSent
    });
  } catch (error) {
    console.error('Error processing NFT metadata and email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process metadata and email',
      emailSent
    }, { status: 500 });
  }
} 