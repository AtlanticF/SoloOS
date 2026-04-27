import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { Cockpit } from '@/pages/Cockpit'
import { Explorer } from '@/pages/Explorer'
import { Review } from '@/pages/Review'
import { Settings } from '@/pages/Settings'
import { Output } from '@/pages/Output'

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/output" element={<Output />} />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
