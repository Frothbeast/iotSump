import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged) {
        prevOptionsRef.current = options;
        isDirtyRef.current = true;
        // Apply options to the instance immediately so it's ready for the next update
        chartInstance.current.options = options;
      }

      // STRICT LOCK: If zoomed, do not touch the data or scales
      if (isZoomed) return;

      // UPDATE DATA: Only if not zoomed
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      // Handle the "snap back" to the current scale
      if (isDirtyRef.current) {
        if (chartInstance.current.resetZoom) {
          chartInstance.current.resetZoom('none');
        }
        chartInstance.current.update();
        isDirtyRef.current = false;
      } else {
        chartInstance.current.update('none');
      }
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
        options: {
          ...options,
          plugins: {
            ...options.plugins,
            zoom: {
              ...options.plugins.zoom,
              zoom: {
                ...options.plugins.zoom.zoom,
                onZoomComplete: ({ chart }) => {
                  // Only reset the 'original' scale limit cache if we are at 1x
                  if (!chart.isZoomedOrPanned()) {
                    chart.resetZoom('none');
                    chart.update();
                  }
                }
              },
              pan: {
                ...options.plugins.zoom.pan,
                onPanComplete: ({ chart }) => {
                  if (!chart.isZoomedOrPanned()) {
                    chart.resetZoom('none');
                    chart.update();
                  }
                }
              }
            }
          }
        }
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