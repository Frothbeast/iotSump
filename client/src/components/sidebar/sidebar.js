const createConfig = (unit) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'start',
      labels: { boxWidth: 40, boxHeight: 2, padding: 1, font: { size: 22 }, color: 'lightgrey' }
    },
    zoom: {
      limits: { x: { min: 'original', max: 'original' }, y: { min: 'original', max: 'original' } },
      pan: { enabled: true, mode: 'xy' },
      zoom: {
        wheel: { enabled: true },
        pinch: { enabled: true },
        mode: 'xy'
      }
    }
  },
  scales: {
    x: {
      type: 'time',
      time: { unit: unit, displayFormats: { minute: 'h:mm a', hour: 'h a', day: 'MMM d' } },
      display: true,
      ticks: { maxTicksLimit: 8, autoSkip: true, color: 'grey' },
      grid: { color: 'rgba(255, 255, 255, 0.42)' }
    },
    y: { display: true, ticks: { color: 'grey' }, grace: '10%', grid: { color: 'rgba(255, 255, 255, 0.42)' } }
  }
});