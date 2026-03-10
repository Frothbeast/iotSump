import React, { useMemo } from 'react';
import SumpChart from '../sumpTable/sumpChart';
import './sidebar.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(...registerables, zoomPlugin);

const Sidebar = ({ isOpen, sumpRecords, selectedHours }) => {
  const timeUnit = selectedHours <= 1 ? 'minute' : (selectedHours <= 48 ? 'hour' : 'day');

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
          x: { min: 'original', max: 'original' },
          y: { min: 'original', max: 'original' }
        },
        pan: {
          enabled: true,
          mode: 'xy',
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy',
          // Ensure that when a user finishes zooming out manually,
          // we tell the chart to update its data bounds.
          onZoomComplete: ({ chart }) => {
            const isZoomed = chart.isZoomedOrPanned();
            if (!isZoomed) {
              chart.update();
            } else {
              chart.update('none');
            }
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
        ticks: { maxTicksLimit: 8, autoSkip: true, color: 'grey' },
        grid: { color: 'rgba(255, 255, 255, 0.42)' }
      },
      y: {
        display: true,
        ticks: { color: 'grey' },
        grace: '10%',
        grid: { color: 'rgba(255, 255, 255, 0.42)' }
      }
    }
  }), [timeUnit]);

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
            datasets={[
              { label: "Low ADC", color: "lightblue", data: sumpRecords.map(r => r.payload?.Ladc) },
              { label: "High ADC", color: "lightgreen", data: sumpRecords.map(r => r.payload?.Hadc) }
            ]}
            options={opt1}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[
              { label: "On Time", color: "pink", data: sumpRecords.map(r => r.payload?.timeOn) },
              { label: "Off Time", color: "red", data: sumpRecords.map(r => r.payload?.timeOff) }
            ]}
            options={opt2}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[{ label: "Duty Cycle", color: "lavender", data: sumpRecords.map(r => r.payload?.duty) }]}
            options={opt3}
          />
        </div>
        <div className="chartContainer" style={transitionStyle}>
          <SumpChart
            labels={sumpRecords.map(r => r.payload?.datetime)}
            datasets={[{
              label: "Interval", color: "cyan",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return (previous - current) / 60000;
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