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
      // Update data references
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      if (optionsChanged) {
        chartInstance.current.options = options;
        // FIX: If the user changes the hour selection, we must reset the zoom state
        // so the chart can properly map the new time range to the full canvas.
        if (chartInstance.current.resetZoom) {
            chartInstance.current.resetZoom();
        }
      }

      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged || !isZoomed) {
        chartInstance.current.update();
      } else {
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