/**
 * Shortens a Stellar address for display, keeping the first and last
 * few characters and collapsing the middle.
 * @param address - the full Stellar public key
 * @returns a shortened display string such as GABC...WXYZ
 */
export function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 5)}...${address.slice(-4)}`
}

/**
 * Formats a unix timestamp as a relative time string, such as
 * "2 hours ago" or "3 days ago", for use across the issuer wall and dashboard.
 * @param timestamp - unix timestamp in seconds
 * @returns a human readable relative time string
 */
export function relativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Determines whether a verification has gone stale based on a
 * configurable re-verification interval, defaulting to seven days.
 * @param verifiedAt - unix timestamp the proof was verified
 * @param intervalSeconds - staleness threshold in seconds
 * @returns true if the verification is older than the interval
 */
export function isVerificationStale(verifiedAt: number, intervalSeconds = 7 * 24 * 60 * 60): boolean {
  return Date.now() / 1000 - verifiedAt > intervalSeconds
}

/**
 * Formats a numeric threshold string with thousand separators for display.
 * @param value - the raw numeric string entered by the issuer
 * @returns a formatted string such as 500,000
 */
export function formatThreshold(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString('en-GB')
}

/**
 * A minimal logger utility. Production paths should use this instead of
 * console.log directly, and it must never be called with anything that
 * could contain an issuer's actual balance value.
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.info(`[verus] ${message}`, meta ?? '')
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.error(`[verus] ${message}`, meta ?? '')
  },
}
