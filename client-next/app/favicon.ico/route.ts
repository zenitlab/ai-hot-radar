import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// 图片元数据
export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

// 图标生成
export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '7px',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 20 40 Q 32 28 44 40"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d="M 14 44 Q 32 22 50 44"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="32" cy="46" r="3.6" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
