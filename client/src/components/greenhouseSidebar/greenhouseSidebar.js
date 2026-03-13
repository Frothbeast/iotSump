import React, { useState, useEffect } from 'react';
import SumpChart from '../sumpTable/sumpChart'; // Reusing the generic engine
import './greenhouseSidebar.css';

const GreenhouseSidebar = ({ isOpen, closeSidebar }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/greenhouse/stats?esp=DISH_UNIT')
        .then(res => res.json())
        .then(json => setData(json))
        .catch(err => console.error("Greenhouse fetch error:", err));
    }
  }, [isOpen]);

  // Labels for the X-axis
  const labels = data.map(item => item.time_mark);

  return (
    <div className={`greenhouse-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Greenhouse Monitor</h2>
        <button className="close-btn" onClick={closeSidebar}>&times;</button>
      </div>
      
      <div className="sidebar-content">
        <div className="chartContainer">
          <h3>Temperature (°C)</h3>
          <SumpChart
            labels={labels}
            datasets={[
              { 
                label: "Average", 
                color: "#ff4d4d", 
                // Directly mapping the flat key from your Greenhouse API
                data: data.map(d => parseFloat(d.temp_avg)) 
              }
            ]}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: { x: { type: 'time', time: { unit: 'minute' } } }
            }}
          />
        </div>

        <div className="chartContainer">
          <h3>Signal Strength (RSSI)</h3>
          <SumpChart
            labels={labels}
            datasets={[
              { 
                label: "Signal", 
                color: "#4d94ff", 
                data: data.map(d => parseInt(d.rssi_best)) 
              }
            ]}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: { x: { type: 'time', time: { unit: 'minute' } } }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GreenhouseSidebar;