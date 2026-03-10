import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      // 1. Detect if the hour selection/options changed
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      // 2. Update the raw data and labels
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      // 3. Update internal options (like timeUnit) but don't trigger a draw yet
      if (optionsChanged) {
        chartInstance.current.options = options;
      }

      // 4. Determine if we are currently zoomed in
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      // THE LOGIC:
      // If the user is ZOOMED IN, we use 'none'.
      // This allows the underlying data to change (24h worth of points exist now)
      // but the "window" (the X-axis min/max) stays exactly where it was.
      if (isZoomed) {
        chartInstance.current.update('none');
      } else {
        // If NOT zoomed, we allow a full update so the chart
        // expands/contracts to the new hour selection.
        chartInstance.current.update();
      }

    } else {
      // Initial creation
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
      prevOptionsRef.current = options;
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