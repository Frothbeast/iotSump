import React, { useState, useEffect } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './greenhouseSidebar.css';

const GreenhouseSidebar = ({ isOpen, closeSidebar }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Using the exact identity from your earlier data packet
      fetch('/api/greenhouse/stats?esp=DISH_UNIT')
        .then(res => res.json())
        .then(json => {
          console.log("Greenhouse Raw Data:", json);
          setData(json);
        })
        .catch(err => console.error("Greenhouse fetch error:", err));
    }
  }, [isOpen]);

  // Labels must be valid date strings for the 'time' scale in SumpChart
  const labels = data.map(item => item.time_mark);

  return (
    <div className={`greenhouse-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Greenhouse</h2>
        <button className="close-btn" onClick={closeSidebar}>&times;</button>
      </div>
      <div className="sidebar-content">
        {data.length > 0 ? (
          <>
            <div className="chartContainer">
              <h3>Temperature (°C)</h3>
              <SumpChart
                labels={labels}
                datasets={[
                  { 
                    label: "Avg Temp", 
                    color: "#ff4d4d", 
                    // Use d.temp_avg directly because the VIEW flattens the JSON
                    data: data.map(d => parseFloat(d.temp_avg)) 
                  },
                  { 
                    label: "High", 
                    color: "#ff9999", 
                    data: data.map(d => parseFloat(d.temp_high)) 
                  }
                ]}
                // Options to match your Sidebar.js time configuration
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      type: 'time',
                      time: { unit: 'minute' }
                    }
                  }
                }}
              />
            </div>
            <div className="chartContainer">
              <h3>Signal Strength (RSSI)</h3>
              <SumpChart
                labels={labels}
                datasets={[
                  { 
                    label: "RSSI", 
                    color: "#4d94ff", 
                    data: data.map(d => parseInt(d.rssi_best)) 
                  }
                ]}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { type: 'time', time: { unit: 'minute' } }
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div style={{padding: '20px'}}>Waiting for data or DISH_UNIT not found...</div>
        )}
      </div>
    </div>
  );
};

export default GreenhouseSidebar;