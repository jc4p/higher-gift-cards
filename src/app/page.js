import MainPage from './main-page';

export const metadata = {
  title: 'Erewhon Gift Card',
  description: 'Buy a gift card in $HIGHER. Not in any way affiliated with Erewhon, just selling you a gift card.',
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: 'https://cover-art.kasra.codes/erewhon-rectangle.png',
      button: {
        title: 'Buy Gift Card',
        action: {
          type: 'launch_frame',
          name: 'EREW-HIGHER Gift Card',
          url: process.env.NEXT_PUBLIC_APP_URL || 'https://erew-higher.kasra.codes',
          splashImageUrl: 'https://cover-art.kasra.codes/erewhon-square.png',
          splashBackgroundColor: '#C15E24'
        }
      }
    })
  }
};

/**
 * Server component wrapper for the client MainPage
 */
export default function Page() {
  return <MainPage />;
}
