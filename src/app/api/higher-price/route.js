export const runtime = 'edge';
/**
 * GET /api/higher-price?apiKey=YOUR_API_KEY
 * Fetch the latest $HIGHER token price from Alchemy
 */
export async function GET(request) {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Alchemy API key' }), { status: 500 });
    }
    const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`;
    const options = {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        addresses: [
          { network: 'base-mainnet', address: '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe' }
        ]
      }),
    };
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), { status: res.status });
    }
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}