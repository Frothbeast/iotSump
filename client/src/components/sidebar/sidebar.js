import React from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './sidebar.css'; 

const Sidebar = ({ isOpen, sumpRecords, selectedHours }) => {
  const timeUnit = selectedHours <= 1 ? 'minute' : (selectedHours <= 48 ? 'hour' : 'day');
  const sidebarChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: true,
          position: 'top', 
          align: 'start',   
          labels: {
            boxWidth: 40,
            boxHeight: 2,
            padding: 1,
            font: {size: 22},
            color: 'lightgrey'
          }
        } 
      },
      scales: {
        x: {
          type: 'time', 
          time: {
            unit: timeUnit,
            displayFormats: {
              minute: 'h:mm a',
              hour: 'h a',
              day: 'MMM d'
            }
          },
          display: true,
          reverse: true 
        }, 
        y: { display: true, ticks: {color: 'grey'}, grace: '10%',grid: {
            color: 'rgba(255, 255, 255, 0.42)' 
          }
        }
      }

    };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-content">
        <div className="chartContainer">
          <SumpChart 
            labels={sumpRecords.map((_, i) => i)}
            datasets={[{ label: "Low ADC Value", color: "lightblue", data: sumpRecords.map(r => r.payload?.Ladc) },
                      { label: "High ADC Value", color: "lightgreen", data: sumpRecords.map(r => r.payload?.Hadc) }]} 
            options={sidebarChartOptions}           
          />
        </div>
        <div className="chartContainer">
          <SumpChart 
            labels={sumpRecords.map((_, i) => i)}
            datasets={[{ label: "Pump On time(s)", color: "pink", data: sumpRecords.map(r => r.payload?.timeOn) },
                      { label: "Pump Off Time(s)", color: "red", data: sumpRecords.map(r => r.payload?.timeOff) }]} 
            options={sidebarChartOptions}
          />
        </div>
        <div className="chartContainer">
          <SumpChart 
            labels={sumpRecords.map((_, i) => i)}
            datasets={[{ label: "Duty Cycle", color: "lavender", data: sumpRecords.map(r => r.payload?.duty) }]}
            options={sidebarChartOptions} 
          />
        </div>
        <div className="chartContainer">
          <SumpChart
            labels={sumpRecords.map((_, i) => i)}
            datasets={[{
              label: "Minutes between pumps",color: "cyan",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return ( previous -current) / 60000;
              })
              }
            ]}
            options={sidebarChartOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
