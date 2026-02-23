import React, { useState, useMemo } from 'react';
import { useSumpData } from './hooks/useSumpData';
import SumpTable from './components/sumpTable/sumpTable';
import ControlBar from './components/ControlBar/ControlBar';
import Sidebar from './components/sidebar/sidebar';
import { calculateColumnStats } from './utils/sumpStats'; // Import logic
import './App.css';

function App() {
  const [selectedHours, setSelectedHours] = useState(24);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { sumpRecords, isLoading } = useSumpData(selectedHours);

  const columnStats = useMemo(() => calculateColumnStats(sumpRecords), [sumpRecords]);

  if (isLoading) return <div className="loader">Loading...</div>;

  return (
    <div className="App">
      <ControlBar
        selectedHours={selectedHours}
        onHoursChange={setSelectedHours}
        columnStats={columnStats}
        sumpRecords={sumpRecords} // Pass raw data for charts
        toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      <main>
        <div className="tableWrapper">
          <SumpTable sumpRecords={sumpRecords} columnStats={columnStats} />
          <Sidebar isOpen={isSidebarOpen} sumpRecords={sumpRecords} />
        </div>
      </main>
    </div>
  );
}

export default App;