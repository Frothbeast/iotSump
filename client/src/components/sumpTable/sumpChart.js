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
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      // 1. Update data references
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      if (optionsChanged) {
        chartInstance.current.options = options;
      }

      // 2. Determine Zoom State
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      // Get the current scale limits to see if we are "at the edges"
      const xAxis = chartInstance.current.scales.x;
      const isAtMaxZoomOut = xAxis && xAxis.min <= xAxis.chart.data.labels[0] &&
                             xAxis.max >= xAxis.chart.data.labels[xAxis.chart.data.labels.length - 1];

      // 3. The Logic:
      // If the hours changed OR the user has manually zoomed all the way out:
      // Trigger a full reset to show all data for the currently selected hours.
      if (optionsChanged || !isZoomed || isAtMaxZoomOut) {
        if (chartInstance.current.resetZoom) {
          chartInstance.current.resetZoom('none');
        }
        chartInstance.current.update();
      } else {
        // If we are still actively zoomed into a specific window:
        // Update data points but do NOT change the axis range.
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