import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  const isDirtyRef = useRef(false);
  // Guard to prevent infinite update loops
  const isResettingRef = useRef(false);

  useEffect(() => {
    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged) {
        prevOptionsRef.current = options;
        isDirtyRef.current = true;
        chartInstance.current.options = options;
      }

      // If zoomed, block all updates to preserve the zoomed window and its data
      if (isZoomed) return;

      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

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
              ...options?.plugins?.zoom,
              zoom: {
                ...options?.plugins?.zoom?.zoom,
                onZoomComplete: ({ chart }) => {
                  // If we are back at 1x and not already in a reset cycle
                  if (!chart.isZoomedOrPanned() && !isResettingRef.current) {
                    isResettingRef.current = true;
                    // Timeout breaks the execution stack to prevent infinite loops
                    setTimeout(() => {
                      chart.resetZoom('none');
                      chart.update();
                      isResettingRef.current = false;
                    }, 20);
                  }
                }
              },
              pan: {
                ...options?.plugins?.zoom?.pan,
                onPanComplete: ({ chart }) => {
                  if (!chart.isZoomedOrPanned() && !isResettingRef.current) {
                    isResettingRef.current = true;
                    setTimeout(() => {
                      chart.resetZoom('none');
                      chart.update();
                      isResettingRef.current = false;
                    }, 20);
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