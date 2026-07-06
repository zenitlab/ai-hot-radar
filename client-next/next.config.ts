import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API 代理到后端 NestJS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/socket.io/:path*',
      },
    ];
  },

  // 输出配置（Docker 优化）
  output: 'standalone',

  // 图片配置
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // 生产优化
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
