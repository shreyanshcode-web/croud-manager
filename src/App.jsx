import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MainWorkspace from './pages/MainWorkspace';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/workspace/*" element={<MainWorkspace />} />
      
      {/* Redirect all legacy paths to the unified workspace */}
      <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
      <Route path="/analytics" element={<Navigate to="/workspace" replace />} />
      <Route path="/zones" element={<Navigate to="/workspace" replace />} />
      <Route path="/settings" element={<Navigate to="/workspace" replace />} />
      <Route path="/ops" element={<Navigate to="/workspace" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
