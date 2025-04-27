'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { transferHigher, mintGiftCardWithVerification } from '@/lib/frame';
import * as frame from '@farcaster/frame-sdk';

// Constants from environment variables
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0d8Cd006C310d537Bd84ba5d649c93EC16abAB97';
const HIGHER_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HIGHER_TOKEN_ADDRESS || '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe';
const HIGHER_RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_HIGHER_RECIPIENT_ADDRESS || '0x0db12C0A67bc5B8942ea3126a465d7a0b23126C7';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erew-higher.kasra.codes';

// HIGHER token amounts for each tier
const PRICE_DATA = [
  { sale: 1, roundedHigher: 4450 },
  { sale: 2, roundedHigher: 8900 },
  { sale: 3, roundedHigher: 17800 },
  { sale: 4, roundedHigher: 35600 },
  { sale: 5, roundedHigher: 71150 },
];

export default function MainPage() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [higherPrice, setHigherPrice] = useState(0.00562); // Default fallback price
  const [priceData, setPriceData] = useState(PRICE_DATA.map(item => ({
    ...item,
    approxUsd: (item.roundedHigher * 0.00562).toFixed(2) // Default calculation
  })));
  const [purchaseStep, setPurchaseStep] = useState('idle'); // idle, transferring, verifying, minting, completed

  useEffect(() => {
    // Fetch current purchase count
    async function fetchCount() {
      try {
        const res = await fetch('/api/purchases');
        const json = await res.json();
        setCount(json.count);
      } catch (err) {
        console.error(err);
      }
    }
    
    // Fetch current HIGHER token price from our server API
    async function fetchHigherPrice() {
      try {
        const res = await fetch('/api/higher-price');
        const data = await res.json();
        
        if (data && data.price) {
          setHigherPrice(data.price);
          
          // Update price data with current prices
          const updatedPriceData = PRICE_DATA.map(item => ({
            ...item,
            approxUsd: (item.roundedHigher * data.price).toFixed(2)
          }));
          setPriceData(updatedPriceData);
        }
      } catch (err) {
        console.error('Error fetching HIGHER price:', err);
      }
    }
    
    fetchCount();
    fetchHigherPrice();
  }, []);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setEmailError('');
    setShowEmailModal(false);
    
    // Continue with the purchase process
    await startPurchaseProcess(email);
  };

  const startPurchaseProcess = async (userEmail) => {
    try {
      // Determine price based on current count
      const nextIndex = count != null ? count : 0;
      const price = priceData[Math.min(nextIndex, priceData.length - 1)];
      
      setMessage(`Step 1/3: Transferring ${price.roundedHigher} $HIGHER tokens...`);
      setPurchaseStep('transferring');
      
      // Transfer HIGHER tokens
      const { txHash, from } = await transferHigher({
        recipient: HIGHER_RECIPIENT_ADDRESS,
        amount: price.roundedHigher,
        tokenAddress: HIGHER_TOKEN_ADDRESS
      });
      
      setMessage(`Step 2/3: Verifying transfer...`);
      setPurchaseStep('verifying');
      
      // Verify the transfer with the server
      // The server will determine the token ID and expected amount
      const verifyResponse = await fetch('/api/verify-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          walletAddress: from
        })
      });
      
      const verifyData = await verifyResponse.json();

      console.log('Received verification data:', verifyData);
      
      if (!verifyData.verified || !verifyData.signature) {
        throw new Error(verifyData.error || 'Failed to verify transfer');
      }
      
      // Get the token ID from the server response
      const { tokenId, signature } = verifyData;
      
      setMessage(`Step 3/3: Minting your gift card NFT...`);
      setPurchaseStep('minting');
      
      // Mint the NFT with the verification signature
      const mintResult = await mintGiftCardWithVerification({
        contractAddress: CONTRACT_ADDRESS,
        txHash,
        tokenId,
        signature
      });
      
      // Record the purchase in the database
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: from,
          paymentTx: txHash,
          mintTx: mintResult.txHash,
          tokenId,
          fid: window.farcaster?.user?.fid || null,
          email: userEmail
        })
      });
      
      // Record NFT metadata
      await fetch('/api/nft-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          purchasePriceHigher: price.roundedHigher,
          ownerAddress: from,
          paymentTx: txHash, 
          mintTx: mintResult.txHash,
          email: userEmail
        })
      });
      
      // Update the UI
      setCount(tokenId);
      setPurchaseStep('completed');
      setMessage(`Gift card in your email and NFT in your wallet!`);
    } catch (err) {
      console.error(err);
      setPurchaseStep('idle');
      setMessage(`Transaction failed: ${err.message || 'Unknown error'}`);
    }
    
    setLoading(false);
  };

  const handleMint = async () => {
    setLoading(true);
    setMessage('');
    
    // Show email collection modal
    setShowEmailModal(true);
  };

  const handleShare = async () => {
    const targetText = 'Check it out: Erewhon Gift Cards available in $HIGHER!';
    const targetURL = BASE_URL;

    // Construct the Warpcast compose intent URL
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    
    try {
      // Use Frame SDK to open the compose intent URL
      try {
        await frame.sdk.actions.openUrl({ url: finalUrl });
      } catch (err) {
        await frame.sdk.actions.openUrl(finalUrl);
      }
    } catch (err) {
      console.error('Error opening Warpcast compose intent:', err);
    }
  };

  const toggleModal = () => {
    setShowModal(!showModal);
  };

  const getButtonText = () => {
    if (loading) {
      switch (purchaseStep) {
        case 'transferring':
          return 'Transferring $HIGHER...';
        case 'verifying':
          return 'Verifying Transfer...';
        case 'minting':
          return 'Minting Gift Card...';
        default:
          return 'Processing...';
      }
    }
    return 'Mint Gift Card';
  };

  return (
    <div className={styles.page}>
      <div className={styles.helpButtonContainer}>
        <button
          className={styles.helpButton}
          onClick={toggleModal}
          aria-label="How it works"
        >
          ?
        </button>
      </div>
      <h1 className={styles.title}>$25 EREWHON GIFT CARD</h1>
      <p className={styles.subtitle}>Gift cards are usable IN STORE ONLY.</p>
      
      <div className={styles.imageWrapper}>
        <Image
          src="https://images.kasra.codes/smoothie.png"
          alt="Gift Card"
          width={400}
          height={400}
          style={{
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'contain'
          }}
          priority
        />
        
        {/* Collection indicator overlay */}
        <div className={styles.collectionOverlay}>
          <span className={styles.collectionNumber}>
            {count !== null ? `${count + 1}/5` : '1/5'}
          </span>
          <div className={styles.priceInfo}>
            {count !== null && count < 5 ? (
              <>
                <p className={styles.priceLine}>
                  <strong>Price:</strong> <span className={styles.priceHigher}>{priceData[count].roundedHigher} $HIGHER</span>
                </p>
                <p className={styles.priceUsd}>
                  ≈ ${priceData[count].approxUsd}
                </p>
              </>
            ) : (
              <>
                <p className={styles.priceLine}>
                  <strong>Price:</strong> <span className={styles.priceHigher}>{priceData[0].roundedHigher} $HIGHER</span>
                </p>
                <p className={styles.priceUsd}>
                  ≈ ${priceData[0].approxUsd}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      
      {message && <p className={styles.message}>{message}</p>}
      <button
        className={`${styles.button} ${styles.mintButton}`}
        onClick={handleMint}
        disabled={loading}
      >
        {getButtonText()}
      </button>
      <button
        className={`${styles.button} ${styles.shareButton}`}
        onClick={handleShare}
      >
        Share
      </button>
      <p className={styles.footerDisclaimer}>
        Not in any way affiliated with Erewhon, just selling you a gift card.
      </p>

      {/* Info Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={toggleModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={toggleModal}>×</button>
            <h2>How It Works</h2>
            <ul className={styles.modalList}>
              <li>You give us your email and mint an NFT.</li>
              <li>You'll receive a PDF of a $25 gift card immediately after your NFT is minted.</li>
              <li>The value of the card is $25, the NFT price doubles with each purchase.</li>
              <li>Gift cards are usable IN STORE ONLY.</li>
              <li>We are not affiliated with Erewhon in any way.</li>
            </ul>
            
            <h3>Pricing Table</h3>
            <div className={styles.pricingTableContainer}>
              <table className={styles.pricingTable}>
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Rounded $HIGHER</th>
                    <th>Approx USD</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.map(item => (
                    <tr key={item.sale} className={count !== null && count + 1 === item.sale ? styles.currentRow : ''}>
                      <td>{item.sale}</td>
                      <td>{item.roundedHigher}</td>
                      <td>${item.approxUsd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Collection Modal */}
      {showEmailModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.closeButton} 
              onClick={() => {
                setShowEmailModal(false);
                setLoading(false);
              }}
            >
              ×
            </button>
            <h2>Enter Your Email</h2>
            <p className={styles.emailDescription}>
              A $25 gift card PDF will be emailed to you immediately after your NFT is minted.
            </p>
            <form onSubmit={handleEmailSubmit} className={styles.emailForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  className={styles.emailInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                {emailError && <p className={styles.emailError}>{emailError}</p>}
              </div>
              <button type="submit" className={styles.emailSubmitButton}>
                Continue with Mint
              </button>
              <p className={styles.emailDisclaimer}>
                We will only use your email to deliver your gift card.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}