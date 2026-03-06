import React, { useState, useMemo, useEffect } from 'react';
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

  const [serverTime, setServerTime] = useState("00:00 AM");

  const cl1pClick = async () => {
    try{
      const response = await fetch('/api/cl1p, {method: 'POST',});
      if (response.status === 204) {
          console.log("Action acknowledged by server.");
          // Optional: Show a temporary "Success" toast/message on the UI
      }
      else {
        console.error("Server returned an error");
      }
    }
    catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const updateTime = () => {
    fetch('/api/time')
      .then(res => res.json())
      .then(data => setServerTime(data.time))
      .catch(err => console.error("Time fetch failed", err));
  };

  useEffect(() => {
    updateTime(); // Get initial time
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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
        serverTime={serverTime}
      />
      <main>
        <div className="tableWrapper">
          <SumpTable sumpRecords={sumpRecords} columnStats={columnStats} />
          <Sidebar isOpen={isSidebarOpen} sumpRecords={sumpRecords} selectedHours={selectedHours} />
        </div>
      </main>
    </div>
  );
}

export default App;