import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { Cockpit } from '@/pages/Cockpit'
import { Explorer } from '@/pages/Explorer'
import { Review } from '@/pages/Review'

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
