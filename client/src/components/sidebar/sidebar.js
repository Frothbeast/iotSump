import React, { useMemo } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './sidebar.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(...registerables, zoomPlugin);

const Sidebar = ({ isOpen, sumpRecords, selectedHours }) => {
  const timeUnit = selectedHours <= 1 ? 'minute' : (selectedHours <= 48 ? 'hour' : 'day');

  // const createConfig = (unit, yMin, yMax) => ({
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: {
  //     legend: {
  //       display: true,
  //       position: 'top',
  //       align: 'start',
  //       labels: { boxWidth: 40, boxHeight: 2, padding: 1, font: { size: 22 }, color: 'lightgrey' }
  //     },
  //     zoom: {
  //       limits: { 
  //         x: { min: 'original', max: 'original' }, 
  //         y: { min: yMin ?? 'original', max: yMax ?? 'original' } 
  //       },
  //       pan: { enabled: true, mode: 'xy' },
  //       zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
  //     }
  //   },
  //   scales: {
  //     x: {
  //       type: 'time',
  //       time: { unit: unit, displayFormats: { minute: 'h:mm a', hour: 'h a', day: 'MMM d' } },
  //       display: true,
  //       ticks: { maxTicksLimit: 8, autoSkip: true, color: 'grey' },
  //       grid: { color: 'rgba(255, 255, 255, 0.42)' }
  //     },
  //     y: { display: true, ticks: { color: 'grey' }, grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.42)' } }
  //   }
  // });

  const createConfig = (unit, yMin, yMaxFloor, dataKey) => {
    // 1. Determine the highest value currently in the data for this specific chart
    let dataPeak = 0;
    if (dataKey === 'time') {
      dataPeak = Math.max(0, ...sumpRecords.map(r => r.payload?.timeOn || 0), ...sumpRecords.map(r => r.payload?.timeOff || 0));
    } else if (dataKey === 'interval') {
      dataPeak = Math.max(0, ...sumpRecords.slice(1).map((r, i) => {
        const current = new Date(r.payload?.datetime).getTime();
        const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
        return (current - previous) / 60000;
      }));
    }

    // 2. The Y-Axis "Original" max is either your chosen floor (e.g. 500) or the dataPeak, whichever is greater
    const finalYMax = Math.max(yMaxFloor, dataPeak);

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
            // 'original' tells the plugin to reset to the min/max values defined in 'scales' below
            x: { min: 'original', max: 'original' }, 
            y: { min: 'original', max: 'original' } 
          },
          pan: { enabled: true, mode: 'xy' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: unit, displayFormats: { minute: 'h:mm a', hour: 'h a', day: 'MMM d' } },
          display: true,
          ticks: { maxTicksLimit: 8, autoSkip: true, color: 'grey' },
          grid: { color: 'rgba(255, 255, 255, 0.42)' },
          // Sets the zoom-out horizontal limit to the current data range
          min: sumpRecords.length > 0 ? sumpRecords[0].payload?.datetime : undefined,
          max: sumpRecords.length > 0 ? sumpRecords[sumpRecords.length - 1].payload?.datetime : undefined
        },
        y: { 
          display: true, 
          ticks: { color: 'grey' }, 
          grace: '10%', 
          grid: { color: 'rgba(255, 255, 255, 0.42)' },
          min: yMin,
          // Sets the zoom-out vertical limit to our conditional maximum
          max: finalYMax
        }
      }
    };
  };

  const opt1 = useMemo(() => createConfig(timeUnit, 500, 1024, 'adc'), [timeUnit, sumpRecords]);
  const opt2 = useMemo(() => createConfig(timeUnit, 0, 500, 'time'), [timeUnit, sumpRecords]);
  const opt3 = useMemo(() => createConfig(timeUnit, 0, 100, 'duty'), [timeUnit, sumpRecords]);
  const opt4 = useMemo(() => createConfig(timeUnit, 0, 60, 'interval'), [timeUnit, sumpRecords]);

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