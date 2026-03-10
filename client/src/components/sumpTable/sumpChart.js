import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  // Track if data/hours changed while we were "frozen" in zoom
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged) {
        prevOptionsRef.current = options;
        isDirtyRef.current = true;
      }

      // If we are zoomed, STOP. Do not update anything.
      if (isZoomed) return;

      // If NOT zoomed, check if we need to update (either new data or a pending change)
      // Only run the heavy update if data is "dirty" or it's a standard flow
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
        }
      });

      chartInstance.current.options = options;
      chartInstance.current.update('none'); // Use 'none' to prevent animation lag
      isDirtyRef.current = false;
    } else {
      const ctx = chartRef.current.getContext('2d');
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
            fill: false,
            tension: 0.4
          }))
        },
        options: options
      });
    }
  }, [datasets, labels, options]);

  // Separate effect to watch for zoom-out events specifically
  useEffect(() => {
    const checkZoom = setInterval(() => {
      if (chartInstance.current && !chartInstance.current.isZoomedOrPanned?.()) {
        if (isDirtyRef.current) {
          // Sync the chart once when it returns to 1x
          chartInstance.current.update();
          isDirtyRef.current = false;
        }
      }
    }, 500); // Check every half second instead of every frame

    return () => clearInterval(checkZoom);
  }, []);

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