import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  // Track if we are in the middle of a zoom-locked state
  const isLockedRef = useRef(false);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      // Check if this SPECIFIC chart instance is currently zoomed/panned
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (!isZoomed) {
        // FULL UPDATE: Only when NOT zoomed.
        // This syncs the 8h/24h/168h selection to the chart.
        chartInstance.current.data.labels = labels;
        datasets.forEach((ds, index) => {
          if (chartInstance.current.data.datasets[index]) {
            chartInstance.current.data.datasets[index].data = ds.data;
            chartInstance.current.data.datasets[index].label = ds.label;
            chartInstance.current.data.datasets[index].borderColor = ds.color;
          }
        });

        // Sync the options (time scales)
        chartInstance.current.options = options;
        chartInstance.current.update();
        isLockedRef.current = false;
      } else {
        // LOCK STATE: User is zoomed in.
        // We do absolutely nothing to the chart instance here.
        // This prevents the "missing data" or "resetting" behavior.
        isLockedRef.current = true;
      }
    } else {
      // Initial Mount
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets.map(ds => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.color,
            backgroundColor: "black",
            borderWidth: 2,
            pointRadius: 1,
            pointStyle: 'circle',
            fill: false,
            tension: 0.4
          }))
        },
        options: options
      });
    }
  }, [datasets, labels, options]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  return <canvas ref={chartRef} />;
};

export default SumpChart;