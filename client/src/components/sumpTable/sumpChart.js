import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  // Keep track of previous options to detect scale changes
  const prevOptionsRef = useRef(options);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      // Update data references
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      // Detect if options changed (e.g., timeUnit changed from 'minute' to 'hour')
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      if (optionsChanged) {
        chartInstance.current.options = options;
      }

      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      // If options changed (new hour selection) OR we aren't zoomed in,
      // do a full update to re-scale the axes.
      if (optionsChanged || !isZoomed) {
        chartInstance.current.update();
      } else {
        // If we are zoomed in and just receiving new data points for the same scale,
        // use 'none' to maintain the user's current zoom window.
        chartInstance.current.update('none');
      }

    } else {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets.map(ds => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.color,
            backgroundColor: ds.backgroundColor,
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