import { NextResponse } from 'next/server';
import { getNftMetadata } from '@/lib/db';

// Base URL for accessing resources
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';

// Specify Edge runtime for better performance and caching
export const runtime = 'edge'; 

// Cache control header for extended caching (1 hour)
const CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

/**
 * Helper to get ordinal text (first, second, third, etc.)
 * @param {number} num - The number to convert
 * @returns {string} The ordinal text representation
 */
function getOrdinalText(num) {
  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  
  if (num >= 1 && num <= ordinals.length) {
    return ordinals[num - 1];
  }
  
  // For numbers beyond our predefined list
  const j = num % 10;
  const k = num % 100;
  let suffix = 'th';
  
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  
  return num + suffix;
}

/**
 * GET /tokens/[tokenId]
 * Returns ERC721 metadata for a specific token ID
 * This is a public endpoint for OpenSea and other platforms
 */
export async function GET(request, { params }) {
  try {
    const tokenId = parseInt(params.tokenId, 10);
    
    if (isNaN(tokenId)) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { 
          status: 400,
          headers: { 'Cache-Control': CACHE_CONTROL }
        }
      );
    }
    
    // Get metadata from database
    const metadata = await getNftMetadata(tokenId);
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'Token not found' },
        { 
          status: 404,
          headers: { 'Cache-Control': CACHE_CONTROL }
        }
      );
    }
    
    // Get ordinal text for description
    const ordinalText = getOrdinalText(tokenId);
    
    // Format metadata according to OpenSea standards
    const erc721Metadata = {
      name: `Erewhon Gift Card #${tokenId}`,
      description: `The ${ordinalText} Erewhon Gift Card ever purchased with cryptocurrency. Value: $25. Limited edition collection of 5 cards.`,
      image: `${BASE_URL}${metadata.image_url}`,
      external_url: `${BASE_URL}/card/${tokenId}`,
      attributes: [
        {
          trait_type: 'Face Value',
          value: `$${metadata.face_value_usd}`
        },
        {
          trait_type: 'Purchase Price',
          value: `${metadata.purchase_price_higher} HIGHER`
        },
        {
          trait_type: 'Position',
          value: Math.min(tokenId, 5),
          max_value: 5
        }
      ]
    };
    
    // Return the metadata with appropriate cache headers
    return NextResponse.json(
      erc721Metadata,
      { 
        status: 200,
        headers: { 'Cache-Control': CACHE_CONTROL }
      }
    );
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}