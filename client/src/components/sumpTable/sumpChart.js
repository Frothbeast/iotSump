import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  // Tracks if hours changed while we were zoomed in
  const isDirtyRef = useRef(false);
  // Tracks if we have already handled the snap-back for the current zoom session
  const hasSnappedRef = useRef(true);

  useEffect(() => {
    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      if (optionsChanged) {
        prevOptionsRef.current = options;
        isDirtyRef.current = true;
      }

      if (isZoomed) {
        // We are zoomed in; mark that we need a snap when we eventually zoom out
        hasSnappedRef.current = false;
        return;
      }

      // If NOT zoomed, and we haven't snapped to current data yet
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      chartInstance.current.options = options;

      // Only reset the zoom cache if a setting change happened or we are returning from zoom
      if (isDirtyRef.current || !hasSnappedRef.current) {
        if (chartInstance.current.resetZoom) {
          chartInstance.current.resetZoom('none');
        }
        chartInstance.current.update();
        isDirtyRef.current = false;
        hasSnappedRef.current = true;
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
        options: options
      });
    }
  }, [datasets, labels, options]);

  // Use a targeted interval to check for the "Snap Back" moment
  useEffect(() => {
    const checkZoom = setInterval(() => {
      if (chartInstance.current) {
        const isCurrentlyZoomed = chartInstance.current.isZoomedOrPanned?.();

        // If the user just reached "Zoom = Out" and we haven't snapped yet
        if (!isCurrentlyZoomed && !hasSnappedRef.current) {
          if (chartInstance.current.resetZoom) {
            chartInstance.current.resetZoom('none');
          }
          chartInstance.current.update();
          hasSnappedRef.current = true;
          isDirtyRef.current = false;
        }
      }
    }, 400);

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