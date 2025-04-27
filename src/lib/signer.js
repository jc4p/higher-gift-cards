/**
 * Utilities for transaction verification and signature generation
 */
import { ethers, getBytes } from 'ethers';

/**
 * Verify a HIGHER token transfer transaction
 * @param {string} txHash - Transaction hash
 * @param {string} recipient - Expected recipient address
 * @param {number} amount - Expected amount of HIGHER tokens
 * @param {string} sender - Expected sender address
 * @returns {Promise<boolean>} - Whether the transaction is valid
 */
export async function verifyHigherTransfer(txHash, recipient, amount, sender) {
  if (!txHash) return false;
  
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      console.error('ALCHEMY_API_KEY is not set');
      return false;
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
        console.log(`Receipt not found (attempt ${attempts}/${maxAttempts}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    if (!receiptData || !receiptData.result) {
      console.error(`No transaction receipt found after ${maxAttempts} attempts`, receiptData);
      return false;
    }
    
    const receipt = receiptData.result;
    
    // Verify the transaction was successful
    if (receipt.status !== '0x1') {
      console.error('Transaction failed', receipt);
      return false;
    }
    
    // Get the transaction details
    const txResponse = await fetch(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionByHash',
        params: [txHash]
      })
    });
    
    const txData = await txResponse.json();
    
    if (!txData.result) {
      console.error('No transaction found', txData);
      return false;
    }
    
    const tx = txData.result;
    
    // Verify sender
    if (tx.from.toLowerCase() !== sender.toLowerCase()) {
      console.error(`Sender mismatch: ${tx.from} !== ${sender}`);
      return false;
    }
    
    // Look for transfer event logs
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const transferLogs = receipt.logs.filter(log => 
      log.topics && 
      log.topics.length >= 3 && 
      log.topics[0] === transferEventSignature
    );
    
    if (transferLogs.length === 0) {
      console.error('No transfer events found in logs');
      return false;
    }
    
    // Verify the recipient is in the logs (topic 2 is the recipient address)
    const targetRecipientLower = recipient.toLowerCase();
    const matchingTransfer = transferLogs.find(log => {
      const recipientTopic = log.topics[2];
      // Convert the topic to an address format
      const parsedAddress = '0x' + recipientTopic.substring(recipientTopic.length - 40);
      return parsedAddress.toLowerCase() === targetRecipientLower;
    });
    
    if (!matchingTransfer) {
      console.error(`No transfer to ${recipient} found`);
      return false;
    }
    
    // Verify amount (in the data field for ERC20 transfers)
    if (matchingTransfer.data) {
      const transferAmount = BigInt(matchingTransfer.data);
      // Convert expected amount to wei (18 decimals)
      const expectedAmountWei = BigInt(Math.floor(amount * 10**18));
      
      // Allow for small rounding differences (0.1%)
      const tolerance = expectedAmountWei / BigInt(1000);
      const difference = transferAmount > expectedAmountWei 
        ? transferAmount - expectedAmountWei 
        : expectedAmountWei - transferAmount;
      
      if (difference > tolerance) {
        console.error(`Amount mismatch: ${transferAmount} vs expected ${expectedAmountWei}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying HIGHER transfer:', error);
    return false;
  }
}

/**
 * Generate a signature for verified minting
 * @param {string} txHash - The verified transaction hash
 * @param {string} recipient - The recipient address that will mint the NFT
 * @param {number} tokenId - The token ID to mint
 * @returns {Promise<string>} - The signature
 */
export async function generateMintSignature(txHash, recipient, tokenId) {
  try {
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SIGNER_PRIVATE_KEY is not set');
    }
    
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Create the message hash
    // This must match what the contract does: 
    // keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n84", txHash, msg.sender, tokenId))
    
    // Format txHash as bytes32
    const txHashHex = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    
    // Use ethers.js to sign the message
    // We need to match exactly what the contract expects
    const messageLength = 84; // Length specified in the contract
    const message = ethers.solidityPacked(
      ['string', 'bytes32', 'address', 'uint256'],
      [
        `\x19Ethereum Signed Message:\n${messageLength}`,
        txHashHex,
        recipient,
        tokenId
      ]
    );
    
    // Hash the message
    const messageHash = ethers.keccak256(message);
    
    // Sign the raw hash (not the message itself) using ethers v6 syntax
    const signature = await wallet.signMessage(getBytes(messageHash));
    
    return signature;
  } catch (error) {
    console.error('Error generating signature:', error);
    throw error;
  }
} 