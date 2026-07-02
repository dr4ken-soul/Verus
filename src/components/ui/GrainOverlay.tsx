import type { ReactNode } from 'react'

/**
 * Wraps app interior pages with the static grain and radial glow treatment.
 * Applies the app-grain and app-glow classes from globals.css rather than
 * the landing page's animated geometric grid, keeping the two visual
 * languages cleanly separated as specified in the design gates.
 * @param children - the page content to render inside the atmospheric shell
 */
export function GrainOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="app-grain min-h-[100dvh] relative">
      <div className="app-glow absolute inset-0 pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  )
}
