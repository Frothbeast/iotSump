// [2025-11-17] Always include all the code I write in the first place, and comment out my code that you change and insert your new correction.
const StatsLib = {
  avg: (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : 0,
  max: (arr) => arr.length ? Math.max(...arr) : 0,
  min: (arr) => arr.length ? Math.min(...arr) : 0,
};

export const calculateColumnStats = (sumpRecords) => {
  if (!sumpRecords?.length) return null;

  // [Correction]: Mapping flat columns directly
  const Hadcs = sumpRecords.map(r => parseFloat(r.Hadc)).filter(v => !isNaN(v));
  const Ladcs = sumpRecords.map(r => parseFloat(r.Ladc)).filter(v => !isNaN(v));
  const timeOns = sumpRecords.map(r => parseFloat(r.timeOn)).filter(v => !isNaN(v));
  const timeOffs = sumpRecords.map(r => parseFloat(r.timeOff)).filter(v => !isNaN(v));
  const hoursOns = sumpRecords.map(r => parseFloat(r.hoursOn)).filter(v => !isNaN(v));
  const duties = sumpRecords.map(r => parseFloat(r.duty)).filter(v => !isNaN(v));

  const lastRecord = sumpRecords[0];
  const dateObj = new Date(lastRecord.timestamp);
  
  return {
    Hadc: { avg: StatsLib.avg(Hadcs), max: StatsLib.max(Hadcs), min: StatsLib.min(Hadcs) },
    Ladc: { avg: StatsLib.avg(Ladcs), max: StatsLib.max(Ladcs), min: StatsLib.min(Ladcs) },
    timeOn: { avg: StatsLib.avg(timeOns) },
    timeOff: { avg: StatsLib.avg(timeOffs) },
    hoursOn: { avg: StatsLib.avg(hoursOns), max: StatsLib.max(hoursOns) },
    duty: { avg: StatsLib.avg(duties) },
    lastTime: dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
    lastDate: dateObj.toLocaleDateString()
  };
};