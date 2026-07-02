# Verus — Frontend Specification

All design decisions are locked. Do not deviate from any value in this file without explicit instruction.

---

## Design Gates (Confirmed)

| Gate | Decision |
|---|---|
| 1. Aesthetic | Dark editorial |
| 2. Navigation | Landing: ghost nav floating transparently over the hero, no background or border. App interior: minimal top bar with tabs |
| 3. Background | Landing: full-bleed premium static hero image plus a coded animated geometric grid overlay at low opacity. App interior: static atmospheric, grain plus subtle radial glow |
| 4. Typography | Fraunces + Barlow + JetBrains Mono |
| 5. Colour palette | Platinum Steel |
| 6. Hero | Full-bleed editorial, bottom-left anchored copy |
| 7. Sections | Hero, Proof statement, Issuer wall, Trust equation, Protocol strip, Terminal CTA (landing). Dashboard, Issuers, Verify, About (app interior) |

---

## Colour System

Define all values as CSS custom properties in `:root` inside `globals.css`. Never hardcode hex values in components.

```css
:root {
  --bg-primary:     #08090f;
  --bg-secondary:   #0e0f18;
  --bg-surface:     #14151f;
  --bg-elevated:    #1c1d2a;
  --accent:         #c2cfe0;
  --accent-hover:   #dde6f4;
  --accent-glow:    rgba(194, 207, 224, 0.10);
  --accent-dim:     #5a6a80;
  --text-primary:   #eaecf2;
  --text-secondary: #7a8098;
  --text-muted:     #3a3f58;
  --border-subtle:  rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --success:        #22c55e;
  --error:          #ef4444;
}
```

---

## Typography

Load in `index.html` before any other styles:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300&family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Apply in `globals.css`:

```css
.font-display { font-family: 'Fraunces', Georgia, serif; }
.font-body    { font-family: 'Barlow', system-ui, sans-serif; }
.font-mono    { font-family: 'JetBrains Mono', 'Courier New', monospace; }
```

Configure in `tailwind.config.ts`:

```typescript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Barlow', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

---

## Liquid Glass Classes

Defined once in `globals.css`, used directly as class names in components.

```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.liquid-glass-strong {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.10);
}

.liquid-glass-dark {
  background: rgba(8, 9, 15, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

Apply `backdrop-filter` only to fixed or sticky elements such as the ghost nav and app top bar. Never apply it inside a scrolling container.

---

## Noise Grain (App Interior Only)

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  opacity: 0.035;
}
```

Apply this only when an app interior route is active. The landing page uses its own grid overlay instead, described below.

---

## Hero Image and Geometric Grid Overlay

**Hero image:** full-bleed 16:9 crop, reference style is a polished dark chrome and steel sphere with a swirling reflective surface (Black Murano Glass Sphere reference). Positioned right-of-centre at 60 to 65 percent across the frame, vertically centred with slight headroom above. The lower-left quadrant stays naturally dark for text overlay.

File location: `public/images/hero-sphere.webp`. Until the real asset is placed, use a placeholder:

```tsx
{/* Hero image slot: replace with public/images/hero-sphere.webp once provided */}
<div className="absolute inset-0 bg-[var(--bg-surface)]" />
```

**Left edge gradient:**

```css
.hero-gradient {
  background: linear-gradient(
    to right,
    var(--bg-primary) 0%,
    rgba(8, 9, 15, 0.85) 30%,
    rgba(8, 9, 15, 0.4) 50%,
    transparent 65%
  );
}
```

**Geometric grid overlay** (coded, no external asset, layered on top of the hero image at very low opacity):

```tsx
/**
 * Animated geometric grid overlay for the landing hero.
 * Slow-moving line intersections evoke cryptographic structure without being loud.
 */
export function GeometricGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]"
      viewBox="0 0 1440 810"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)">
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
```

---

## Ghost Nav (Landing)

```tsx
/**
 * Ghost navigation bar for the landing page.
 * Floats transparently over the hero with no background, blur or border.
 */
export function GhostNav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-8 py-6">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo slot: replace with public/logo.svg once provided */}
        <span className="font-display text-xl text-[var(--text-primary)] tracking-tight">Verus</span>
        <button className="liquid-glass rounded-full px-5 py-2.5 text-sm font-body
          text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
          Connect wallet
        </button>
      </div>
    </nav>
  )
}
```

---

## App Top Bar With Tabs (App Interior)

```tsx
/**
 * App interior navigation bar.
 * Minimal top bar: wordmark and wallet status left, tab links right.
 */
export function AppNav({ activeTab }: { activeTab: string }) {
  const tabs = ['Dashboard', 'Issuers', 'Verify', 'About']
  return (
    <nav className="liquid-glass-dark fixed top-0 inset-x-0 z-50 px-8 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          {/* Logo slot: replace with public/logo.svg once provided */}
          <span className="font-display text-lg text-[var(--text-primary)]">Verus</span>
          <span className="font-mono text-xs text-[var(--text-muted)]">0x4f2a...8c1d</span>
        </div>
        <div className="flex items-center gap-6">
          {tabs.map((tab) => (
            <a
              key={tab}
              href={`/app/${tab.toLowerCase()}`}
              className={`font-body text-sm transition-colors ${
                activeTab === tab
                  ? 'text-[var(--accent)] border-b border-[var(--accent)] pb-1'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

---

## Landing Page Sections

### Section 1: Hero

Full viewport height (`min-h-[100dvh]`, never `h-screen`). Hero image fills the background, gradient bleeds from the left, geometric grid overlays at low opacity, ghost nav floats above everything. Copy is anchored bottom-left with a stagger entrance.

```tsx
/**
 * Landing hero section.
 * Full-bleed image with bottom-left anchored copy and a coded geometric grid overlay.
 */
export function Hero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden">
      {/* Hero image slot: replace with public/images/hero-sphere.webp once provided */}
      <div className="absolute inset-0 bg-[var(--bg-surface)]" />
      <div className="absolute inset-0 hero-gradient" />
      <GeometricGrid />
      <GhostNav />
      <div className="absolute bottom-16 left-8 max-w-xl">
        <motion.span
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="font-mono text-xs text-[var(--accent-dim)] tracking-widest uppercase"
        >
          Real-world ZK on Stellar
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-5xl text-[var(--text-primary)] leading-tight mt-3"
        >
          Prove your reserves.<br />Reveal nothing.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="font-body text-[var(--text-secondary)] mt-4"
        >
          Verus lets any Stellar issuer prove their reserves exceed a threshold
          without ever revealing what they actually hold.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="liquid-glass-strong rounded-full px-6 py-3 mt-6 font-body
            text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          Generate a proof
        </motion.button>
      </div>
    </section>
  )
}
```

### Section 2: Proof Statement

One large full-width sentence, no bullets, no numbered list. A CSS-drawn annotation marks public versus private.

```tsx
/**
 * The proof statement section.
 * A single full-width sentence stating exactly what Verus proves, with a
 * connecting annotation marking what stays public and what stays private.
 */
export function ProofStatement() {
  return (
    <section className="py-32 px-8 max-w-5xl mx-auto relative">
      <p className="font-display text-3xl md:text-4xl text-[var(--text-primary)] leading-snug">
        Verus proves your reserves clear a threshold without ever showing the
        number behind it.
      </p>
      <div className="flex gap-12 mt-12">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="font-mono text-sm text-[var(--text-secondary)]">Public: threshold, status, timestamp</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
          <span className="font-mono text-sm text-[var(--text-secondary)]">Private: the actual balance</span>
        </div>
      </div>
    </section>
  )
}
```

### Section 3: Issuer Wall

Grid of issuer cards. Use believable contextual data, never generic placeholders.

```tsx
/**
 * Issuer wall section.
 * Live-looking grid of verified issuers showing threshold, status and proof age.
 */
export function IssuerWall() {
  const issuers = [
    { name: 'Meridian Capital Reserve', asset: 'USDC', threshold: '500,000', age: '2 hours ago' },
    { name: 'Tideline Settlement Fund', asset: 'XLM', threshold: '2,100,000', age: '11 hours ago' },
    { name: 'Northgate Treasury', asset: 'USDC', threshold: '1,250,000', age: '1 day ago' },
  ]
  return (
    <section className="py-24 px-8 max-w-6xl mx-auto">
      <h2 className="font-display text-2xl text-[var(--text-primary)] mb-8">Verified on Stellar</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {issuers.map((issuer) => (
          <div key={issuer.name} className="liquid-glass rounded-[var(--radius-lg)] p-6">
            <span className="font-mono text-xs text-[var(--success)]">Verified</span>
            <h3 className="font-display text-lg text-[var(--text-primary)] mt-2">{issuer.name}</h3>
            <p className="font-body text-sm text-[var(--text-secondary)] mt-1">
              At least {issuer.threshold} {issuer.asset}
            </p>
            <p className="font-mono text-xs text-[var(--text-muted)] mt-4">{issuer.age}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### Section 4: Trust Equation

Two dark panels side by side, the contrast carries the message.

```tsx
/**
 * Trust equation section.
 * Two panels contrasting what is publicly visible against what stays hidden.
 */
export function TrustEquation() {
  return (
    <section className="py-24 px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-8">
        <h3 className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest">Anyone can see</h3>
        <ul className="mt-4 space-y-2 font-body text-[var(--text-secondary)]">
          <li>The threshold claimed</li>
          <li>The verification status</li>
          <li>The proof timestamp</li>
        </ul>
      </div>
      <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-8">
        <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">No one sees</h3>
        <ul className="mt-4 space-y-2 font-body text-[var(--text-secondary)]">
          <li>The actual reserve balance</li>
          <li>Wallet holdings beyond the proof</li>
          <li>Any transaction history not on the verifier itself</li>
        </ul>
      </div>
    </section>
  )
}
```

### Section 5: Protocol Strip

Three compact columns, one sentence each.

```tsx
/**
 * Protocol strip section.
 * Three columns naming the circuit, proof system and verifier with one sentence each.
 */
export function ProtocolStrip() {
  const items = [
    { label: 'Circom circuit', body: 'A range proof checks the balance against the threshold without exposing either value to the circuit output.' },
    { label: 'Groth16 proof', body: 'Generated client-side in the browser, cheap to verify and proven on existing Stellar verifier contracts.' },
    { label: 'Stellar verifier', body: 'A Soroban contract checks the proof on-chain and records the result publicly.' },
  ]
  return (
    <section className="py-24 px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[var(--border-subtle)]">
      {items.map((item) => (
        <div key={item.label}>
          <span className="font-mono text-xs text-[var(--accent-dim)] uppercase tracking-widest">{item.label}</span>
          <p className="font-body text-sm text-[var(--text-secondary)] mt-3">{item.body}</p>
        </div>
      ))}
    </section>
  )
}
```

### Section 6: Terminal CTA

A terminal-style mock input, not a standard centred headline and button.

```tsx
/**
 * Terminal CTA section.
 * A terminal-style mock showing a simulated proof generation sequence.
 */
export function TerminalCta() {
  return (
    <section className="py-32 px-8 max-w-2xl mx-auto text-center">
      <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-6 text-left font-mono text-sm">
        <p className="text-[var(--text-muted)]">$ verus generate-proof --threshold 500000 --asset USDC</p>
        <p className="text-[var(--text-secondary)] mt-2">Building circuit witness...</p>
        <p className="text-[var(--text-secondary)]">Generating Groth16 proof...</p>
        <p className="text-[var(--success)] mt-2">Proof valid. Ready to submit on-chain.</p>
      </div>
      <button className="liquid-glass-strong rounded-full px-8 py-3.5 mt-8 font-body
        text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
        Generate proof
      </button>
    </section>
  )
}
```

---

## App Interior Pages

All app interior pages sit on a `static atmospheric` background: near-black base, grain overlay from `body::after`, and a subtle radial glow behind the main content area.

```css
.app-glow {
  background: radial-gradient(circle at 50% 30%, var(--accent-glow), transparent 60%);
}
```

**Dashboard:** three stat cards in `liquid-glass-strong` style across the top (issuers verified, proofs generated, average proof age), a recent activity list below using `border-t` and `divide-y` rather than individually boxed cards, and a large Generate Proof button.

**Issuers:** a searchable table, `border-t` and `divide-y` for rows rather than individual cards given the data density, status badge per row, search input filtering by issuer name or asset.

**Verify:** the core flow. Threshold input, balance input, Generate Proof button, proof status panel, Submit On-Chain button appearing once a valid proof exists. Loading states use skeleton shimmer during proof generation given it can take several seconds.

**About:** plain-language explanation of the circuit using prose, not bullet points, with a protocol strip similar to the landing page repeated here for context, and links to the public repo and the deployed Soroban verifier address.

---

## Component Rules

- CSS class-based hover states only, no inline JS onMouseEnter or onMouseLeave handlers
- Framer Motion for all entrance animations, blur-in pattern as shown in the Hero example
- `min-h-[100dvh]` for any full-height section, never `h-screen`
- CSS Grid for any multi-column layout, never flexbox percentage math
- Tinted shadows matched to the accent hue when elevation is needed, never a generic dark drop shadow
- No pure black or pure white anywhere, the palette above already accounts for this
- No gradient text on headings
- No custom cursors
- No generic placeholder content anywhere: no "John Doe", no round numbers like "1,000,000", use specific contextual figures and names as shown in the Issuer Wall example
