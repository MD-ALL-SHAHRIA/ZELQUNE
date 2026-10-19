import { ImageResponse } from 'next/og';

export const alt = 'Zelqune';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Brand card for link previews (Latin text only: no Bangla font is bundled into the image). */
export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 64,
        background: '#4A3426',
        color: '#F4ECDF',
      }}
    >
      <svg width="180" height="270" viewBox="0 0 64 96">
        <path d="M4 92V32a28 28 0 0 1 56 0v60z" fill="none" stroke="#E3A857" strokeWidth="3" />
        <path d="M20 84V44M32 84V36M44 84V44" stroke="#F4ECDF" strokeWidth="3" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 96, fontWeight: 700 }}>Zelqune</div>
        <div style={{ fontSize: 40, color: '#E3A857' }}>Wood and light for your walls</div>
      </div>
    </div>,
    size,
  );
}
