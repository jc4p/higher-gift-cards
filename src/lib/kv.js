/**
 * Cloudflare KV utilities for caching data via REST API
 * Used for a Vercel-hosted app to access Cloudflare KV
 */

// Default cache expiration time (5 minutes)
const DEFAULT_CACHE_TTL = 300;

// Key prefix for all KV entries
const KEY_PREFIX = 'gift-cards:';

/**
 * Check if Cloudflare KV is configured
 * @returns {boolean} Whether Cloudflare KV is properly configured
 */
function isKVConfigured() {
  return !!(
    process.env.KV_BINDING && 
    process.env.CF_ACCOUNT_ID && 
    process.env.CF_API_TOKEN
  );
}

/**
 * Get a value from Cloudflare KV with optional default
 * @param {string} key - The key to fetch
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {Promise<any>} The value or default
 */
export async function getKV(key, defaultValue = null) {
  try {
    if (!isKVConfigured()) {
      console.warn('Cloudflare KV is not configured');
      return defaultValue;
    }
    
    const prefixedKey = `${KEY_PREFIX}${key}`;
    const accountId = process.env.CF_ACCOUNT_ID;
    const namespaceId = process.env.KV_BINDING;
    const apiToken = process.env.CF_API_TOKEN;
    
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(prefixedKey)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return defaultValue;
      }
      throw new Error(`Cloudflare API returned ${response.status}`);
    }
    
    const data = await response.text();
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  } catch (error) {
    console.error(`Error getting KV value for ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a value in Cloudflare KV
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Whether the operation succeeded
 */
export async function setKV(key, value, ttl = DEFAULT_CACHE_TTL) {
  try {
    if (!isKVConfigured()) {
      console.warn('Cloudflare KV is not configured');
      return false;
    }
    
    const prefixedKey = `${KEY_PREFIX}${key}`;
    const accountId = process.env.CF_ACCOUNT_ID;
    const namespaceId = process.env.KV_BINDING;
    const apiToken = process.env.CF_API_TOKEN;
    
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(prefixedKey)}`;
    
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'text/plain'
      },
      body: serializedValue,
      // Add expiration if TTL is provided
      ...(ttl ? { searchParams: { expiration_ttl: ttl } } : {})
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare API returned ${response.status}`);
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`Error setting KV value for ${key}:`, error);
    return false;
  }
}

/**
 * Fetch HIGHER token price and cache it in KV
 * @returns {Promise<number>} The current price of HIGHER token
 */
export async function getHigherTokenPrice() {
  const CACHE_KEY = 'higher-token-price';
  const FALLBACK_PRICE = 0.00562;
  const CACHE_TTL = 300; // 5 minutes
  
  try {
    // Try to get from cache first
    const cachedPrice = await getKV(CACHE_KEY, null);
    if (cachedPrice !== null) {
      return cachedPrice;
    }
    
    // Fetch fresh price from Alchemy
    const apiKey = process.env.ALCHEMY_API_KEY || 'demo';
    const tokenAddress = process.env.HIGHER_TOKEN_ADDRESS || '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe';
    
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          addresses: [
            {
              network: 'base-mainnet',
              address: tokenAddress
            }
          ]
        })
      }
    );
    
    if (!res.ok) {
      throw new Error(`Alchemy API returned ${res.status}`);
    }
    
    const data = await res.json();
    
    // Extract price from the new API response format
    let price = FALLBACK_PRICE;
    if (data && 
        data.tokens && 
        data.tokens.length > 0 && 
        data.tokens[0].price && 
        typeof data.tokens[0].price.value === 'number') {
      price = data.tokens[0].price.value;
    }
    
    // Cache the price
    await setKV(CACHE_KEY, price, CACHE_TTL);
    
    return price;
  } catch (error) {
    console.error('Error fetching HIGHER token price:', error);
    return FALLBACK_PRICE;
  }
} 