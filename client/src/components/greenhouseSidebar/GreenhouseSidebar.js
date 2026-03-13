import React, { useState, useEffect } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './greenhouseSidebar.css';

const GreenhouseSidebar = ({ isOpen, closeSidebar }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch specifically for the DISH_UNIT
      fetch('/api/greenhouse/stats?esp=DISH_UNIT')
        .then(res => res.json())
        .then(json => setData(json))
        .catch(err => console.error("Greenhouse fetch error:", err));
    }
  }, [isOpen]);

  const labels = data.map(item => item.time_mark);

  return (
    <div className={`greenhouse-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Greenhouse</h2>
        <button className="close-btn" onClick={closeSidebar}>&times;</button>
      </div>
      <div className="sidebar-content">
        <div className="chartContainer">
          <h3>Temperature (°C)</h3>
          <SumpChart
            labels={labels}
            datasets={[
              { label: "Avg", color: "#ff4d4d", data: data.map(d => d.temp_avg) },
              { label: "High", color: "#ff9999", data: data.map(d => d.temp_high) }
            ]}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
        <div className="chartContainer">
          <h3>Signal Strength (RSSI)</h3>
          <SumpChart
            labels={labels}
            datasets={[
              { label: "Best", color: "#4d94ff", data: data.map(d => d.rssi_best) },
              { label: "Worst", color: "#003d99", data: data.map(d => d.rssi_worst) }
            ]}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default GreenhouseSidebar;