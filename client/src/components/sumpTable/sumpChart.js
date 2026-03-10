import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  // We use this to "freeze" the data the chart is looking at while zoomed
  const frozenDataRef = useRef({ labels, datasets });

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      // THE LOGIC:
      // If NOT zoomed, we accept the new data (8h, 24h, etc.) and update the chart.
      if (!isZoomed) {
        chartInstance.current.data.labels = labels;
        datasets.forEach((ds, index) => {
          if (chartInstance.current.data.datasets[index]) {
            chartInstance.current.data.datasets[index].data = ds.data;
          }
        });
        chartInstance.current.options = options;
        chartInstance.current.update();

        // Update our "frozen" reference to match the current state
        frozenDataRef.current = { labels, datasets };
      }
      // If currently ZOOMED, we do NOT update the chart's data.
      // We keep the old data visible so the user doesn't see "missing data"
      // just because they changed a background setting.
      else {
         // We do nothing here. The chart continues to display the data
         // it had when it was last at 1x zoom.
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
      frozenDataRef.current = { labels, datasets };
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