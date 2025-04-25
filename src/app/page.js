import MainPage from './main-page';

export const metadata = {
  title: 'Erewhon Gift Card',
  description: 'Buy a gift card in $HIGHER. Not in any way affiliated with Erewhon, just selling you a gift card.',
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: '<PREVIEW_IMAGE_URL>',
      button: {
        title: 'Mint Gift Card',
        action: {
          type: 'launch_frame',
          name: 'Erewhon Gift Card',
          url: process.env.NEXT_PUBLIC_APP_URL || '',
          splashImageUrl: '<SPLASH_IMAGE_URL>',
          splashBackgroundColor: '#000000'
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
