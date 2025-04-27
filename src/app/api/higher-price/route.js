import { NextResponse } from 'next/server';
import { getHigherTokenPrice } from '@/lib/kv';

const runtime = 'edge';

// Default price if everything fails
const FALLBACK_PRICE = 0.00562;

/**
 * GET handler for /api/higher-price
 * Returns the current HIGHER token price
 */
export async function GET() {
  try {
    // Get the token price via KV-cached Alchemy API
    const price = await getHigherTokenPrice();
    
    // Enable edge caching by using a Cache-Control header
    // This will cache the response at the edge for 5 minutes
    return NextResponse.json(
      { price },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error in higher-price API route:', error);
    return NextResponse.json(
      { price: FALLBACK_PRICE, error: 'Failed to fetch token price' },
      { status: 500 }
    );
  }
}