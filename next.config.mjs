/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL('https://images.kasra.codes/**')],
  },
};

export default nextConfig;
