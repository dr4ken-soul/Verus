import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Issuers } from './pages/Issuers'
import { Verify } from './pages/Verify'
import { About } from './pages/About'

/**
 * Root application component.
 * Wires up the landing page and the four app interior pages behind
 * the /app route prefix, as defined in the confirmed routes table.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/issuers" element={<Issuers />} />
        <Route path="/app/verify" element={<Verify />} />
        <Route path="/app/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
