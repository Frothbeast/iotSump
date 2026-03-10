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
      // 1. Detect if the hour selection changed
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      // 2. Update data and labels
      chartInstance.current.data.labels = labels;

      // If the hours changed, we re-map the datasets entirely
      // to ensure Chart.js recognizes the new array lengths
      if (optionsChanged) {
        chartInstance.current.data.datasets = datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.backgroundColor,
          borderWidth: 2,
          pointRadius: 1,
          pointStyle: 'circle',
          fill: false,
          tension: 0.4
        }));

        chartInstance.current.options = options;

        // Reset zoom so the new data fills the screen
        if (chartInstance.current.resetZoom) {
          chartInstance.current.resetZoom('none');
        }

        // Force full update to parse the new data
        chartInstance.current.update();
      } else {
        // Standard data update (new records arriving)
        datasets.forEach((ds, index) => {
          if (chartInstance.current.data.datasets[index]) {
            chartInstance.current.data.datasets[index].data = ds.data;
          }
        });

        const isZoomed = chartInstance.current.isZoomedOrPanned?.();
        if (!isZoomed) {
          chartInstance.current.update();
        } else {
          chartInstance.current.update('none');
        }
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