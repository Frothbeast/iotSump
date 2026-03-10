import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  const needsScaleUpdateRef = useRef(false);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      // 1. Always update data points in the background
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
        }
      });

      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged) {
        chartInstance.current.options = options;
        if (isZoomed) {
          // 2. Mark that we need a full refresh once the user zooms out
          needsScaleUpdateRef.current = true;
          chartInstance.current.update('none');
        } else {
          // 3. Not zoomed? Update immediately
          chartInstance.current.update();
          needsScaleUpdateRef.current = false;
        }
      } else {
        // Regular data stream update
        if (isZoomed) {
          chartInstance.current.update('none');
        } else {
          chartInstance.current.update();
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
      // Attach the reference to the instance so the plugin hook can see it
      chartInstance.current.needsScaleUpdate = needsScaleUpdateRef;
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