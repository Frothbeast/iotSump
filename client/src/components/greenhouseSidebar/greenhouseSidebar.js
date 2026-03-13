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

  const labels = data.map(item => item.time_mark);

  // Time-scale options are required for the data to render against time_mark strings
  const greenhouseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: { unit: 'minute' },
        ticks: { color: 'grey' }
      },
      y: {
        ticks: { color: 'grey' }
      }
    },
    plugins: {
      legend: { display: true, labels: { color: 'lightgrey' } }
    }
  };

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
                data: data.map(d => parseFloat(d.temp_avg)) 
              }
            ]}
            options={greenhouseOptions}
          />
        </div>

        <div className="chartContainer">
          <h3>Signal Strength (RSSI)</h3>
          <SumpChart
              labels={labels}
              datasets={[
                { 
                  // CORRECTION: Map to rssi_best, not temp_avg
                  label: "RSSI (dBm)", 
                  color: "#4d94ff", 
                  data: data.map(d => parseInt(d.rssi_best)) 
                }
              ]}
              options={greenhouseOptions}
            />
        </div>
      </div>
    </div>
  );
};

export default GreenhouseSidebar;