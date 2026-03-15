import React, { useMemo } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './sidebar.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(...registerables, zoomPlugin);

const Sidebar = ({ isOpen, sumpRecords, selectedHours }) => {
  const timeUnit = selectedHours <= 1 ? 'minute' : (selectedHours <= 48 ? 'hour' : 'day');

  // Calculate dynamic maximums for the two "Time" related charts
  const dynamicMaxs = useMemo(() => {
    const onTimeVals = sumpRecords.map(r => r.payload?.timeOn || 0);
    const offTimeVals = sumpRecords.map(r => r.payload?.timeOff || 0);
    
    const intervalVals = sumpRecords.slice(1).map((r, i) => {
      const current = new Date(r.payload?.datetime).getTime();
      const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
      return (current - previous) / 60000;
    });

    return {
      timeMax: Math.max(500, ...onTimeVals, ...offTimeVals),
      intervalMax: Math.max(60, ...intervalVals)
    };
  }, [sumpRecords]);

  const createConfig = (unit, yMin, yMax) => {
    const xMin = sumpRecords.length > 0 ? new Date(sumpRecords[0].payload?.datetime).getTime() : undefined;
    const xMax = sumpRecords.length > 0 ? new Date(sumpRecords[sumpRecords.length - 1].payload?.datetime).getTime() : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: { boxWidth: 40, boxHeight: 2, padding: 1, font: { size: 22 }, color: 'lightgrey' }
        },
        zoom: {
          limits: { 
            x: { min: xMin, max: xMax }, 
            y: { min: yMin, max: yMax } 
          },
          pan: { enabled: true, mode: 'xy' },
          zoom: { 
            wheel: { enabled: true }, 
            pinch: { enabled: true }, 
            mode: 'xy',
            overScaleMode: 'xy'
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: unit, displayFormats: { minute: 'h:mm a', hour: 'h a', day: 'MMM d' } },
          display: true,
          ticks: { maxTicksLimit: 8, autoSkip: true, color: 'grey' },
          grid: { color: 'rgba(255, 255, 255, 0.42)' },
          // Restoring min/max to establish the initial "zoomed out" view
          min: xMin,
          max: xMax
        },
        y: { 
          display: true, 
          ticks: { color: 'grey' }, 
          grace: '10%', 
          grid: { color: 'rgba(255, 255, 255, 0.42)' },
          min: yMin,
          max: yMax
        }
      }
    };
  };

  const opt1 = useMemo(() => createConfig(timeUnit, 500, 1024), [timeUnit, sumpRecords]);
  const opt2 = useMemo(() => createConfig(timeUnit, 0, dynamicMaxs.timeMax), [timeUnit, sumpRecords, dynamicMaxs.timeMax]);
  const opt3 = useMemo(() => createConfig(timeUnit, 0, 100), [timeUnit, sumpRecords]);
  const opt4 = useMemo(() => createConfig(timeUnit, 0, dynamicMaxs.intervalMax), [timeUnit, sumpRecords, dynamicMaxs.intervalMax]);

  const labels = sumpRecords.map(r => r.payload?.datetime);

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-content">
        <div className="chartContainer">
          <SumpChart
            labels={labels}
            datasets={[
              { label: "Low ADC", color: "lightblue", data: sumpRecords.map(r => r.payload?.Ladc) },
              { label: "High ADC", color: "lightgreen", data: sumpRecords.map(r => r.payload?.Hadc) }
            ]}
            options={opt1}
          />
        </div>
        <div className="chartContainer">
          <SumpChart
            labels={labels}
            datasets={[
              { label: "On Time", color: "pink", data: sumpRecords.map(r => r.payload?.timeOn) },
              { label: "Off Time", color: "red", data: sumpRecords.map(r => r.payload?.timeOff) }
            ]}
            options={opt2}
          />
        </div>
        <div className="chartContainer">
          <SumpChart
            labels={labels}
            datasets={[{ label: "Duty Cycle", color: "lavender", data: sumpRecords.map(r => r.payload?.duty) }]}
            options={opt3}
          />
        </div>
        <div className="chartContainer">
          <SumpChart
            labels={labels}
            datasets={[{
              label: "Interval", color: "cyan",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return (current - previous) / 60000;
              })
            }]}
            options={opt4}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;