import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useTestStore } from './store/useTestStore'
import Dashboard from './pages/Dashboard'
import SetupTest from './pages/SetupTest'
import ActiveTest from './pages/ActiveTest'
import Analysis from './pages/Analysis'

function App() {
  const theme = useTestStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
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
