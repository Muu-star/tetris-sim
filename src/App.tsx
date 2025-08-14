import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SimulationPage } from './pages/SimulationPage';
import { RenPage } from './pages/RenPage';
import { TSpinPage } from './pages/TSpinPage';
import { DrillPage } from './pages/DrillPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { GameProvider } from './contexts/GameContext';
import './App.css';

function App() {
  return (
    <GameProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<SimulationPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/ren" element={<RenPage />} />
            <Route path="/tspin" element={<TSpinPage />} />
            <Route path="/drill" element={<DrillPage />} />
            <Route path="/optimization" element={<OptimizationPage />} />
          </Routes>
        </Layout>
      </Router>
    </GameProvider>
  );
}

export default App;