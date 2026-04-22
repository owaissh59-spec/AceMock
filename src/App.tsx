import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SetupTest from './pages/SetupTest'
import ActiveTest from './pages/ActiveTest'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<SetupTest />} />
          <Route path="/test" element={<ActiveTest />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
