import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const SumpChart = ({ datasets, labels, options }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const prevOptionsRef = useRef(options);
  // This ref tracks if a change in hours occurred while the user was zoomed in
  const pendingUpdateRef = useRef(false);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      const optionsChanged = prevOptionsRef.current !== options;
      prevOptionsRef.current = options;

      const isZoomed = chartInstance.current.isZoomedOrPanned?.();

      // IF ZOOMED: Do absolutely nothing.
      // Do not update data, do not update labels, do not update options.
      // This prevents the data from being "cut off" when hours are reduced background.
      if (isZoomed) {
        if (optionsChanged) {
          pendingUpdateRef.current = true;
        }
        return;
      }

      // IF NOT ZOOMED: Update everything to match current settings.
      chartInstance.current.data.labels = labels;
      datasets.forEach((ds, index) => {
        if (chartInstance.current.data.datasets[index]) {
          chartInstance.current.data.datasets[index].data = ds.data;
          chartInstance.current.data.datasets[index].label = ds.label;
          chartInstance.current.data.datasets[index].borderColor = ds.color;
        }
      });

      chartInstance.current.options = options;
      chartInstance.current.update();
      pendingUpdateRef.current = false;

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
      // Attach the flag to the instance so the zoom plugin hook can see it
      chartInstance.current.pendingUpdate = pendingUpdateRef;
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