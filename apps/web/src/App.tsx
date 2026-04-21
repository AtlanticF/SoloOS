import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}

function Cockpit() { return <div>Cockpit</div> }
function Explorer() { return <div>Explorer</div> }
function Review() { return <div>Review</div> }

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
