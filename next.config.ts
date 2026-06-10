import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        // Neutral path so ad blockers / Brave Shields don't match the
        // Supabase storage URL pattern in their filter lists.
        source: '/img/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'}/storage/v1/object/public/:path*`,
      },
    ];
  },
};

export default nextConfig;
