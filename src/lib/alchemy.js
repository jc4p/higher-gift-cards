/**
 * Utilities for interacting with Alchemy API
 */

/**
 * Extract token ID from a mint transaction receipt
 * @param {string} txHash - Transaction hash of the mint transaction
 * @returns {Promise<string|null>} - The token ID or null if not found
 */
export async function extractTokenIdFromTx(txHash) {
  if (!txHash) return null;
  
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      console.error('ALCHEMY_API_KEY is not set');
      return null;
    }
    
    // Get the transaction receipt with retry logic
    let receiptData = null;
    let attempts = 0;
    const maxAttempts = 5;
    const delayMs = 2000; // 2 second delay

    while (!receiptData?.result && attempts < maxAttempts) {
      attempts++;
      const receiptResponse = await fetch(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
      });
      
      receiptData = await receiptResponse.json();
      
      if (!receiptData.result && attempts < maxAttempts) {
        console.log(`Receipt not found for token ID extraction (attempt ${attempts}/${maxAttempts}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    if (!receiptData || !receiptData.result) {
      console.error(`No transaction receipt found for token ID extraction after ${maxAttempts} attempts`, receiptData);
      return null;
    }
    
    const receipt = receiptData.result;
    
    // Look for Transfer events (ERC-721/ERC-1155)
    // Common Transfer event topic for ERC-721: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    if (!receipt.logs || receipt.logs.length === 0) {
      console.log('No logs found in transaction receipt');
      return null;
    }
    
    // Find Transfer logs - specifically look for ERC-721 Transfer events
    const transferLogs = receipt.logs.filter(log => 
      log.topics && 
      log.topics.length >= 4 && 
      log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
      log.topics[1].includes('0000000000000000000000000000000000000000') // From zero address (mint)
    );
    
    if (transferLogs.length === 0) {
      console.log('No transfer events found in logs');
      return null;
    }
    
    // The token ID is usually in the 3rd topic for ERC-721 Transfer events
    // Remove leading zeros and convert from hex
    const tokenIdHex = transferLogs[0].topics[3];
    const tokenId = parseInt(tokenIdHex, 16).toString();
    
    console.log(`Found token ID ${tokenId} in transaction ${txHash}`);
    return tokenId;
  } catch (error) {
    console.error('Error extracting token ID from transaction:', error);
    return null;
  }
} 