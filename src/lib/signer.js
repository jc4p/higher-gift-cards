/**
 * Utilities for transaction verification and signature generation
 */
import { keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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
 * Generate a signature for verified minting using viem
 * @param {string} txHash - The verified transaction hash (0x-prefixed)
 * @param {string} minterAddress - The address that will call the mint function (msg.sender)
 * @param {number | bigint} tokenId - The token ID to mint
 * @returns {Promise<string>} - The signature as a hex string (0x-prefixed)
 */
export async function generateMintSignature(txHash, minterAddress, tokenId) {
  try {
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey || !privateKey.startsWith('0x')) {
      // Viem requires 0x prefix for private keys
      throw new Error('SIGNER_PRIVATE_KEY is not set or is invalid (must start with 0x)');
    }

    // Create a viem account object from the private key
    const account = privateKeyToAccount(privateKey);

    // Ensure txHash is 0x prefixed (should be already, but good practice)
    const txHashHex = txHash.startsWith('0x') ? txHash : `0x${txHash}`;

    // Define the message structure matching the contract
    const messageLength = 84; // Same as contract
    const prefix = `\x19Ethereum Signed Message:\n${messageLength}`;
    
    // Pack the data exactly like abi.encodePacked in the contract
    // Use BigInt for uint256
    const packedData = encodePacked(
      ['string', 'bytes32', 'address', 'uint256'],
      [prefix, txHashHex, minterAddress, BigInt(tokenId)]
    );

    // Hash the packed data (equivalent to keccak256 in Solidity)
    const messageHash = keccak256(packedData);

    // Sign the hash directly (contract uses tryRecover on the hash)
    const signature = await account.signHash(messageHash);

    console.log('[DEBUG viem signer] Hashing Data:', { txHashHex, minterAddress, tokenId: BigInt(tokenId) });
    console.log('[DEBUG viem signer] Message Hash:', messageHash);
    console.log('[DEBUG viem signer] Generated Signature:', signature);
    
    return signature;

  } catch (error) {
    console.error('[VIEM] Error generating signature:', error);
    throw error;
  }
} 