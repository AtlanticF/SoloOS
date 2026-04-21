import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'

function Cockpit() { return <div className="text-zinc-600 text-xs">Cockpit coming in Task 9</div> }
function Explorer() { return <div className="text-zinc-600 text-xs">Explorer coming in Task 10</div> }
function Review() { return <div className="text-zinc-600 text-xs">Review coming in Task 11</div> }

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
