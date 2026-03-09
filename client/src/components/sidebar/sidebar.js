import React, { useMemo } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './sidebar.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(...registerables, zoomPlugin);

const Sidebar = ({ isOpen, sumpRecords, selectedHours }) => {
  const timeUnit = selectedHours <= 1 ? 'minute' : (selectedHours <= 48 ? 'hour' : 'day');

  // This base configuration is memoized so it only changes if the timeUnit changes
  const baseOptions = useMemo(() => ({
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
          font: { size: 22 },
          color: 'lightgrey'
        }
      },
      zoom: {
        limits: {
          // Setting these to 'original' helps the plugin respect the zoomed state
          x: { min: 'original', max: 'original' },
          y: { min: 'original', max: 'original' }
        },
        pan: {
          enabled: true,
          mode: 'xy',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
          onZoomComplete: ({ chart }) => {
            // Force update without reframing
            chart.update('none');
          }
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
        reverse: false,
        ticks: {
          maxTicksLimit: 8,
          autoSkip: true,
          color: 'grey'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.42)'
        }
      },
      y: {
        display: true,
        ticks: { color: 'grey' },
        grace: '10%',
        grid: {
          color: 'rgba(255, 255, 255, 0.42)'
        }
      }
    }
  }), [timeUnit]);

  // FIX: Each chart gets a unique, stable reference
  const opt1 = useMemo(() => ({ ...baseOptions }), [baseOptions]);
  const opt2 = useMemo(() => ({ ...baseOptions }), [baseOptions]);
  const opt3 = useMemo(() => ({ ...baseOptions }), [baseOptions]);
  const opt4 = useMemo(() => ({ ...baseOptions }), [baseOptions]);

  const transitionStyle = {
    transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'width'
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-content">
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[{ label: "Low ADC Value", color: "lightblue", backgroundColor: "black", data: sumpRecords.map(r => r.payload?.Ladc) },
                      { label: "High ADC Value", color: "lightgreen", backgroundColor: "black", data: sumpRecords.map(r => r.payload?.Hadc) }]}
            options={opt1}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[
              { label: "Pump On time(s)",
                color: "pink",
                data: sumpRecords.map(r => r.payload?.timeOn),
                backgroundColor: "black"
              },
              { label: "Pump Off Time(s)",
                color: "red",
                data: sumpRecords.map(r => r.payload?.timeOff),
                backgroundColor: "black"
              }
            ]}
            options={opt2}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[{ label: "Duty Cycle", color: "lavender", backgroundColor: "black", data: sumpRecords.map(r => r.payload?.duty) }]}
            options={opt3}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[{
              label: "Minutes between pumps", color: "cyan", backgroundColor: "black",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return (previous - current) / 60000;
              })
            }
            ]}
            options={opt4}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;