import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

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
        {/* 雷达波纹 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: '100%',
            paddingBottom: '4px',
          }}
        >
          {/* 外层波纹 */}
          <div
            style={{
              width: '18px',
              height: '9px',
              borderLeft: '2px solid rgba(255,255,255,0.45)',
              borderTop: '2px solid rgba(255,255,255,0.45)',
              borderRight: '2px solid rgba(255,255,255,0.45)',
              borderRadius: '18px 18px 0 0',
              marginBottom: '-7px',
            }}
          />
          {/* 内层波纹 */}
          <div
            style={{
              width: '12px',
              height: '6px',
              borderLeft: '2px solid rgba(255,255,255,0.7)',
              borderTop: '2px solid rgba(255,255,255,0.7)',
              borderRight: '2px solid rgba(255,255,255,0.7)',
              borderRadius: '12px 12px 0 0',
              marginBottom: '-4px',
            }}
          />
          {/* 中心点 */}
          <div
            style={{
              width: '4px',
              height: '4px',
              background: 'white',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
