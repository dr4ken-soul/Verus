/**
 * Animated geometric grid overlay for the landing hero.
 * A slow-moving line pattern evokes cryptographic structure at very low
 * opacity, coded entirely in SVG with no external asset required.
 */
export function GeometricGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]"
      viewBox="0 0 1440 810"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="verus-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#verus-grid)">
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="60 60"
          dur="40s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  )
}
