import { BRAND_COLORS } from '@/shared/theme/ThemeProvider'

/**
 * BizClear logo: three circles (blue, yellow, red) in a triangular arrangement.
 * Use width/height to scale; aspect ratio is preserved by default.
 */
export default function BizClearLogo({ width = 120, height, style = {} }) {
  const h = height ?? width
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={width}
      height={h}
      style={{ display: 'block', ...style }}
      aria-hidden
    >
      {/* Top: blue */}
      <circle cx="50" cy="22" r="18" fill={BRAND_COLORS.blue} />
      {/* Bottom-left: yellow */}
      <circle cx="22" cy="72" r="18" fill={BRAND_COLORS.yellow} />
      {/* Bottom-right: red */}
      <circle cx="78" cy="72" r="18" fill={BRAND_COLORS.red} />
    </svg>
  )
}
