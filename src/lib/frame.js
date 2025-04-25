import * as frame from '@farcaster/frame-sdk';

// Base Mainnet chain ID
const BASE_CHAIN_ID = 8453;
// Hexadecimal representation of Base Mainnet chain ID
const BASE_CHAIN_HEX = '0x2105';

/**
 * Initialize Farcaster Frame if in a frame context
 */
export async function initializeFrame() {
  const user = await frame.sdk.context.user;
  if (!user || !user.fid) {
    // Not running inside a Farcaster frame
    return;
  }
  // Expose user FID globally if needed
  window.userFid = user.fid;
  // Signal that the app is ready to remove splash screen
  await frame.sdk.actions.ready();
}

/**
 * Mint a gift card NFT by sending a transaction via the frame wallet
 * @param {Object} params
 * @param {string} params.contractAddress - NFT contract address
 * @param {string} params.value - Hex string of wei to send (e.g., '0x2540be400')
 * @param {string} params.data - Hex-encoded call data for mint function
 * @returns {Promise<{txHash: string, from: string}>}
 */
export async function mintGiftCard({ contractAddress, value, data }) {
  // Ensure frame is initialized
  await initializeFrame();
  const provider = frame.sdk.wallet.ethProvider;
  // Request user to connect accounts
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const from = accounts[0];
  // Check current chain
  let chainIdHex = await provider.request({ method: 'eth_chainId' });
  const chainId = typeof chainIdHex === 'number' ? chainIdHex : parseInt(chainIdHex, 16);
  if (chainId !== BASE_CHAIN_ID) {
    // Switch to Base Mainnet
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
  }
  // Build transaction parameters
  const txParams = { to: contractAddress, from, value, data };
  // Send transaction
  const txHash = await provider.request({ method: 'eth_sendTransaction', params: [txParams] });
  return { txHash, from };
}