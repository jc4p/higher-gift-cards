import { NextResponse } from 'next/server';
import { getPurchaseCount, recordPurchase } from '@/lib/db';
import { extractTokenIdFromTx } from '@/lib/alchemy';

const runtime = 'edge';

/**
 * GET /api/purchases - return total number of purchases
 */
export async function GET() {
  try {
    const count = await getPurchaseCount();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch purchase count' }, { status: 500 });
  }
}

/**
 * POST /api/purchases - record a new purchase and return updated count
 */
export async function POST(request) {
  try {
    const { walletAddress, paymentTx, mintTx, fid, email } = await request.json();
    
    // Validate required fields
    if (!walletAddress || !email) {
      return NextResponse.json({ 
        error: 'Missing required parameters', 
        required: ['walletAddress', 'email'] 
      }, { status: 400 });
    }
    
    // Extract token ID from mint transaction if available
    let tokenId = null;
    if (mintTx) {
      try {
        // Allow some time for the transaction to be mined and indexed
        // This might need to be a separate background process for production
        tokenId = await extractTokenIdFromTx(mintTx);
      } catch (extractErr) {
        console.error('Error extracting token ID:', extractErr);
        // Continue without token ID
      }
    }
    
    // Record purchase with all available data
    await recordPurchase(
      walletAddress, 
      paymentTx || null, 
      mintTx || null, 
      tokenId, 
      fid || null, 
      email
    );
    
    const count = await getPurchaseCount();
    return NextResponse.json({ 
      count,
      tokenId: tokenId || null
    });
  } catch (err) {
    console.error('Error recording purchase:', err);
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
  }
}