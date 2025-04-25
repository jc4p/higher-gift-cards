import * as frame from '@farcaster/frame-sdk';
import {
  PRICE_SCHEDULE,
  HIGHER_TOKEN_ADDRESS,
  DEV_WALLET_ADDRESS,
} from './config';

/**
 * Initialize Farcaster Frame if available
 */
export async function initializeFrame() {
  const user = await frame.sdk.context.user;
  if (!user || !user.fid) {
    // Not in a Farcaster frame
    return;
  }
  window.userFid = user.fid;
  // Signal that the frame is ready
  await frame.sdk.actions.ready();
}

/**
 * Trigger the mint transaction via the frame's Ethereum provider
 * @returns {Promise<{ txHash: string, giftNumber: number }>}
 */
/**
 * Mint a gift card by sending HIGHER tokens to the developer wallet,
 * then recording the purchase in the backend.
 * @returns {Promise<{ txHash: string, giftNumber: number }>}
 */
export async function mintGiftCard() {
  const provider = frame.sdk.wallet.ethProvider;
  // 1) Request account access
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  // 2) Ensure Base mainnet (chainId 8453)
  let chainId = await provider.request({ method: 'eth_chainId' });
  const chainDec = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  if (chainDec !== 8453) {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }],
    });
  }
  // 3) Get next gift number
  const getRes = await fetch('/api/purchases');
  if (!getRes.ok) throw new Error('Failed to fetch purchase count');
  const getData = await getRes.json();
  const giftNumber = getData.count + 1;
  // 4) Build HIGHER transfer to dev wallet
  const transferFunctionSignature = '0xa9059cbb';
  const recipient = DEV_WALLET_ADDRESS;
  const recipientPadded = recipient.toLowerCase().slice(2).padStart(64, '0');
  const priceWei = PRICE_SCHEDULE[giftNumber - 1];
  const amountHex = BigInt(priceWei).toString(16);
  const amountPadded = amountHex.padStart(64, '0');
  const data = `${transferFunctionSignature}${recipientPadded}${amountPadded}`;
  // 5) Send transfer transaction
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      { from: account, to: HIGHER_TOKEN_ADDRESS, data, value: '0x0' },
    ],
  });
  // 6) Wait for confirmation
  const waitReceipt = async (hash) => {
    while (true) {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [hash],
      });
      if (receipt && receipt.status === '0x1') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  await waitReceipt(txHash);
  // 7) Record purchase in backend
  const postRes = await fetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: account, txHash, fid: window.userFid }),
  });
  const postData = await postRes.json();
  if (!postRes.ok) throw new Error(postData.error || 'Failed to record purchase');
  return { txHash, giftNumber };
}