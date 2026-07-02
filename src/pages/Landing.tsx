import { Hero } from '../components/sections/Hero'
import { ProofStatement } from '../components/sections/ProofStatement'
import { IssuerWall } from '../components/sections/IssuerWall'
import { TrustEquation } from '../components/sections/TrustEquation'
import { ProtocolStrip } from '../components/sections/ProtocolStrip'
import { TerminalCta } from '../components/sections/TerminalCta'

/**
 * The Verus landing page, assembling the six confirmed sections in order:
 * hero, proof statement, issuer wall, trust equation, protocol strip,
 * terminal CTA. Wallet connection is not required to view this page.
 */
export function Landing() {
  return (
    <main>
      <Hero />
      <ProofStatement />
      <IssuerWall />
      <TrustEquation />
      <ProtocolStrip />
      <TerminalCta />
    </main>
  )
}
