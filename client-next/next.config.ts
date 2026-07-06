import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API 代理到后端 NestJS
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiUrl}/socket.io/:path*`,
      },
    ];
  },

  // 输出配置（Docker 优化）
  output: 'standalone',

  // 图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // 生产优化
  compress: true,
  poweredByHeader: false,

  // 完全禁用所有开发指示器
  devIndicators: false,
};

export default nextConfig;
