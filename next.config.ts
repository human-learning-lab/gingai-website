import type { NextConfig } from 'next';

const VIKTOR_API = process.env.VIKTOR_API_URL ?? 'https://wriggly-tutu-groin.ngrok-free.dev';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  async rewrites() {
    return [
      // Bypass the serverless function body limit (4.5 MB) by rewriting
      // large file uploads directly to Viktor's backend.
      {
        source: '/api/upload-media',
        destination: `${VIKTOR_API}/upload_media`,
      },
    ];
  },
};

export default nextConfig;
