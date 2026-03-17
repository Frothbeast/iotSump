// [2025-11-17] Always include all the code I write in the first place, and comment out my code that you change and insert your new correction.

const StatsLib = {
  // avg: (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : 0,
  // New Correction: Return a raw number to prevent math failures in downstream functions
  avg: (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
  max: (arr) => arr.length ? Math.max(...arr) : 0,
  min: (arr) => arr.length ? Math.min(...arr) : 0,
};

const formatMsToTime = (ms) => {
  // New Correction: Force conversion to Number and handle 0 or NaN cases
  const totalMs = Math.abs(Number(ms)) || 0;
  
  // New Correction: Ensure toString() is called before .padStart() to avoid "slice is not a function" errors
  const h = Math.floor(totalMs / 3600000).toString().padStart(2, '0');
  const m = Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const calculateColumnStats = (sumpRecords) => {
  if (!sumpRecords?.length) return null;

  const Hadcs = sumpRecords.map(r => parseFloat(r.Hadc)).filter(v => !isNaN(v));
  const Ladcs = sumpRecords.map(r => parseFloat(r.Ladc)).filter(v => !isNaN(v));
  const timeOns = sumpRecords.map(r => parseFloat(r.timeOn)).filter(v => !isNaN(v));
  const timeOffs = sumpRecords.map(r => parseFloat(r.timeOff)).filter(v => !isNaN(v));
  const hoursOns = sumpRecords.map(r => parseFloat(r.hoursOn)).filter(v => !isNaN(v));
  const duties = sumpRecords.map(r => parseFloat(r.duty)).filter(v => !isNaN(v));

  const lastRecord = sumpRecords[0];
  
  // New Correction: Ensure we have an array of numeric timestamps
  const dateObjs = sumpRecords.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));

  // const diffs = dateObj.slice(1).map((v, i) => new Date(dateObj[i]).getTime() - new Date(v).getTime());
  // New Correction: Map through timestamps to find deltas between consecutive states
  const diffs = dateObjs.slice(0, -1).map((v, i) => v - dateObjs[i + 1]);

  // New Correction: Split the timestamp string safely
  const parts = String(lastRecord.timestamp || "").split(/[ T]/);
  const lastDate = parts[0] || "";
  
  const lastTime = lastRecord.timestamp ? 
    new Date(lastRecord.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : "";

  const lastTimeOn = parseFloat(lastRecord?.timeOn) || 0;
  const lastTimeOff = parseFloat(lastRecord?.timeOff) || 0;
  const lastHoursOn = parseFloat(lastRecord?.hoursOn) || 0;
  const period = Math.round((lastTimeOn + lastTimeOff) / 60);

  return {
    Hadc: { avg: StatsLib.avg(Hadcs).toFixed(0), max: StatsLib.max(Hadcs), min: StatsLib.min(Hadcs) },
    Ladc: { avg: StatsLib.avg(Ladcs).toFixed(0), max: StatsLib.max(Ladcs), min: StatsLib.min(Ladcs) },
    timeOn: { avg: StatsLib.avg(timeOns).toFixed(0), max: StatsLib.max(timeOns), min: StatsLib.min(timeOns) },
    timeOff: { avg: StatsLib.avg(timeOffs).toFixed(0), max: StatsLib.max(timeOffs), min: StatsLib.min(timeOffs) },
    hoursOn: lastHoursOn,
    period: period,
    duty: { avg: StatsLib.avg(duties).toFixed(0), max: StatsLib.max(duties), min: StatsLib.min(duties) },
    datetime: {
      avg: formatMsToTime(StatsLib.avg(diffs)),
      max: formatMsToTime(StatsLib.max(diffs)),
      min: formatMsToTime(StatsLib.min(diffs))
    },
    lastDate: lastDate,
    lastTime: lastTime
  };
};