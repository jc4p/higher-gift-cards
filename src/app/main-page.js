'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { mintGiftCard } from '@/lib/frame';

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '<CONTRACT_ADDRESS>';
// Price schedule per consecutive gift card purchase (hex Wei strings)
// e.g., ['0x2386f26fc10000', '0x47dfe56fe20000', ...]
const PRICE_SCHEDULE = [
  /* TODO: fill in price hex values per purchase (wei) */
];
// Encoded call data for your contract's mint function
const MINT_CALL_DATA = '<MINT_FUNCTION_CALL_DATA>';

// Price data for display
const PRICE_DATA = [
  { sale: 1, targetUsd: 25, exactHigher: 4447.62, roundedHigher: 4450, approxUsd: 25.03 },
  { sale: 2, targetUsd: 50, exactHigher: 8895.24, roundedHigher: 8900, approxUsd: 50.06 },
  { sale: 3, targetUsd: 100, exactHigher: 17790.48, roundedHigher: 17800, approxUsd: 100.11 },
  { sale: 4, targetUsd: 200, exactHigher: 35580.96, roundedHigher: 35600, approxUsd: 200.22 },
  { sale: 5, targetUsd: 400, exactHigher: 71161.92, roundedHigher: 71150, approxUsd: 399.97 },
];

// Helper to get ordinal suffix
function getOrdinalSuffix(i) {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export default function MainPage() {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

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
    fetchCount();
  }, []);

  const handleMint = async () => {
    setLoading(true);
    setMessage('');
    try {
      const nextIndex = count != null ? count : 0;
      const valueHex = PRICE_SCHEDULE[nextIndex] || PRICE_SCHEDULE[PRICE_SCHEDULE.length - 1];
      const { txHash, from } = await mintGiftCard({
        contractAddress: CONTRACT_ADDRESS,
        value: valueHex,
        data: MINT_CALL_DATA,
      });
      // Record purchase in database
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: from, txHash }),
      });
      const json = await res.json();
      const newCount = json.count;
      setCount(newCount);
      setMessage(`Congrats, you're the ${newCount}${getOrdinalSuffix(newCount)} person to purchase an Erewhon smoothie in cryptocurrency!`);
    } catch (err) {
      console.error(err);
      setMessage('Transaction failed or was canceled.');
    }
    setLoading(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'EREW-$HIGHER Gift Card',
      text: 'Check out my Erewhon Gift Card NFT!',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModal = () => {
    setShowModal(!showModal);
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
      <h1 className={styles.title}>EREW-$HIGHER Gift Card</h1>
      
      {/* Collection indicator and price */}
      <div className={styles.collectionIndicator}>
        <span className={styles.collectionNumber}>
          {count !== null ? `${count + 1}/5` : '1/5'}
        </span>
        <div className={styles.priceInfo}>
          {count !== null && count < 5 ? (
            <>
              <p className={styles.priceLine}>
                <strong>Price:</strong> {PRICE_DATA[count].roundedHigher} $HIGHER
              </p>
              <p className={styles.priceLine}>
                <strong>≈</strong> ${PRICE_DATA[count].approxUsd}
              </p>
            </>
          ) : (
            <>
              <p className={styles.priceLine}>
                <strong>Price:</strong> {PRICE_DATA[0].roundedHigher} $HIGHER
              </p>
              <p className={styles.priceLine}>
                <strong>≈</strong> ${PRICE_DATA[0].approxUsd}
              </p>
            </>
          )}
        </div>
      </div>
      
      <p className={styles.subtitle}>Value: $25.</p>
      <p className={styles.subtitle}>Gift cards are usable IN STORE ONLY.</p>
      
      {/* Modal */}
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
                    <th>Target USD</th>
                    <th>Rounded $HIGHER</th>
                    <th>Approx USD</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_DATA.map(item => (
                    <tr key={item.sale} className={count !== null && count + 1 === item.sale ? styles.currentRow : ''}>
                      <td>{item.sale}</td>
                      <td>${item.targetUsd}</td>
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
      </div>
      {message && <p className={styles.message}>{message}</p>}
      <button
        className={`${styles.button} ${styles.mintButton}`}
        onClick={handleMint}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Mint Gift Card'}
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
    </div>
  );
}