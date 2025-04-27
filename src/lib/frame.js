import * as frame from '@farcaster/frame-sdk';

// Base Mainnet chain ID
const BASE_CHAIN_ID = 8453;
// Hexadecimal representation of Base Mainnet chain ID
const BASE_CHAIN_HEX = '0x2105';

/**
 * Initialize Farcaster Frame if in a frame context
 */
export async function initializeFrame() {
  const context = await frame.sdk.context;
  if (!context || !context.user) {
    return;
  }

  let user = context.user;

  if (user.user) {
    user = user.user;
  }

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
 * Helper function to check and switch network if needed
 * @param {object} provider - Frame SDK ethProvider
 */
async function ensureBaseNetwork(provider) {
  if (!provider) {
    throw new Error('Provider not available');
  }
  // Check current chain
  let chainIdHex = await provider.request({ method: 'eth_chainId' });
  const chainId = typeof chainIdHex === 'number' ? chainIdHex : parseInt(chainIdHex, 16);
  
  if (chainId !== BASE_CHAIN_ID) {
    console.log(`Switching network from ${chainId} to Base (${BASE_CHAIN_ID})`);
    // Switch to Base Mainnet
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
    console.log('Network switched to Base');
  } else {
    console.log('Already on Base network');
  }
}

/**
 * Convert ETH amount to Wei hex string
 * @param {number} eth - Amount in ETH
 * @returns {string} - Hex string with 0x prefix
 */
function ethToWei(eth) {
  // Convert to BigInt and multiply by 10^18
  const wei = BigInt(Math.floor(eth * 1e18)).toString(16);
  return '0x' + wei;
}

/**
 * Convert HIGHER token amount to proper format for transfer
 * @param {number} higherAmount - Amount of HIGHER tokens
 * @returns {string} - Hex string with 0x prefix
 */
function higherToWei(higherAmount) {
  // HIGHER has 18 decimals like ETH
  return ethToWei(higherAmount);
}

/**
 * Transfer HIGHER tokens to a recipient
 * @param {Object} params - Parameters for the transfer
 * @param {string} params.recipient - Recipient address
 * @param {number} params.amount - Amount of HIGHER tokens to send
 * @param {string} params.tokenAddress - HIGHER token contract address
 * @returns {Promise<{txHash: string, from: string}>} - Transaction hash and sender address
 */
export async function transferHigher({ recipient, amount, tokenAddress }) {
  if (!frame.sdk || !frame.sdk.wallet || !frame.sdk.wallet.ethProvider) {
    throw new Error('Frame SDK not initialized');
  }
  
  const provider = frame.sdk.wallet.ethProvider;
  
  // Request user to connect accounts
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  
  if (!accounts || !accounts[0]) {
    throw new Error('No wallet connected');
  }

  const from = accounts[0];
  
  // Ensure user is on Base network
  await ensureBaseNetwork(provider);

  // ERC20 transfer function signature: transfer(address,uint256)
  const transferFunctionSignature = '0xa9059cbb';
  
  // Prepare recipient address (remove 0x, pad to 32 bytes)
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  
  // Prepare amount (convert to wei, remove 0x, pad to 32 bytes)
  const amountHex = higherToWei(amount);
  const amountNoPrefix = amountHex.startsWith('0x') ? amountHex.slice(2) : amountHex;
  const paddedAmount = amountNoPrefix.padStart(64, '0');
  
  // Construct the complete data payload
  const data = `${transferFunctionSignature}${recipientPadded}${paddedAmount}`;
  
  // Send the transaction
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: tokenAddress,
      data,
      value: '0x0' // No ETH value, just token transfer
    }]
  });
  
  return { txHash, from };
}

/**
 * Mint a gift card with verified transaction
 * @param {Object} params - Parameters for minting
 * @param {string} params.contractAddress - Gift card contract address
 * @param {string} params.txHash - HIGHER transfer transaction hash
 * @param {number} params.tokenId - Token ID to mint
 * @param {string} params.signature - Signature from server verification
 * @returns {Promise<{txHash: string, from: string}>} - Transaction hash and sender address
 */
export async function mintGiftCardWithVerification({ contractAddress, txHash, tokenId, signature }) {
  if (!frame.sdk || !frame.sdk.wallet || !frame.sdk.wallet.ethProvider) {
    throw new Error('Frame SDK not initialized');
  }
  
  const provider = frame.sdk.wallet.ethProvider;

  // Request user to connect accounts
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  
  if (!accounts || !accounts[0]) {
    throw new Error('No wallet connected');
  }

  const from = accounts[0];
  
  // Ensure user is on Base network
  await ensureBaseNetwork(provider);

  // mintWithVerifiedTx function signature
  const functionSignature = '0x' + Array.from(
    new TextEncoder().encode('mintWithVerifiedTx(bytes32,uint256,bytes)')
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Convert string txHash to bytes32 format if needed
  const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  
  // Encode the function parameters
  // This is a simplified version - in production you would use a proper ABI encoder
  const encodedParams = [
    formattedTxHash,
    tokenId,
    signature
  ];
  
  // Send the transaction
  const mintTxHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: contractAddress,
      data: functionSignature + encodedParams.join(''),
      value: '0x0'
    }]
  });
  
  return { txHash: mintTxHash, from };
}