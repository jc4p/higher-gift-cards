import { NextResponse } from 'next/server';
import { getPurchaseCount, recordPurchase } from '@/lib/db';

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
    const { walletAddress, txHash, fid } = await request.json();
    if (!walletAddress || !txHash || !fid) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    await recordPurchase(walletAddress, txHash, fid);
    const count = await getPurchaseCount();
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
  }
}