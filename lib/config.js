/**
 * Configuration for Higher Gift Cards.
 * Update the placeholder values as needed.
 */
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
// Price schedule for each gift card in wei (as strings). Update with actual values.
export const PRICE_SCHEDULE = [
  // Rounded $HIGHER token amounts multiplied by 1e18 (Wei)
  '4450000000000000000000',  // 4450 $HIGHER (~$25.03)
  '8900000000000000000000',  // 8900 $HIGHER (~$50.06)
  '17800000000000000000000', // 17800 $HIGHER (~$100.11)
  '35600000000000000000000', // 35600 $HIGHER (~$200.22)
  '71150000000000000000000', // 71150 $HIGHER (~$399.97)
];
// Number of gift cards available
export const MAX_SUPPLY = 5;
// Gift card value in USD
export const GIFT_VALUE = 25;
// Encoded data for the mint function call. Replace with your contract's mint function data
export const MINT_FUNCTION_DATA = '<MINT_FUNCTION_DATA>';
// HIGHER token contract (ERC-20) address
export const HIGHER_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HIGHER_TOKEN_ADDRESS || '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe';
// Developer wallet address to receive HIGHER payments
export const DEV_WALLET_ADDRESS = process.env.NEXT_PUBLIC_DEV_WALLET_ADDRESS || '0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7';