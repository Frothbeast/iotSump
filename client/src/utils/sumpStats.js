// src/utils/sumpStats.js

const StatsLib = {
  avg: (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : 0,
  max: (arr) => arr.length ? Math.max(...arr) : 0,
  min: (arr) => arr.length ? Math.min(...arr) : 0,
};

const formatMsToTime = (ms) => {
  const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const calculateColumnStats = (sumpRecords) => {
  if (!sumpRecords?.length) return null;

  const Hadcs = sumpRecords.map(r => parseFloat(r.payload?.Hadc)).filter(v => !isNaN(v));
  const Ladcs = sumpRecords.map(r => parseFloat(r.payload?.Ladc)).filter(v => !isNaN(v));
  const timeOns = sumpRecords.map(r => parseFloat(r.payload?.timeOn)).filter(v => !isNaN(v));
  const timeOffs = sumpRecords.map(r => parseFloat(r.payload?.timeOff)).filter(v => !isNaN(v));
  const hoursOns = sumpRecords.map(r => parseFloat(r.payload?.hoursOn)).filter(v => !isNaN(v));
  const duties = sumpRecords.map(r => parseFloat(r.payload?.duty)).filter(v => !isNaN(v));
  const datetime = sumpRecords.map(r => r.payload?.datetime);
  
  const diffs = datetime.slice(1).map((v, i) => new Date(datetime[i]).getTime() - new Date(v).getTime());
  const parts = datetime[0].split(" ");
  const lastDate = parts[0];
  const lastTime = parts[1];
  const lastRecord = sumpRecords[sumpRecords.length - 1]?.payload;
  const lastTimeOn = parseFloat(lastRecord?.timeOn) || 0;
  const lastTimeOff = parseFloat(lastRecord?.timeOff) || 0;
  const lastHoursOn = parseFloat(lastRecord?.hoursOn) || 0;
  return {
    Hadc: { avg: StatsLib.avg(Hadcs), max: StatsLib.max(Hadcs), min: StatsLib.min(Hadcs) },
    Ladc: { avg: StatsLib.avg(Ladcs), max: StatsLib.max(Ladcs), min: StatsLib.min(Ladcs) },
    timeOn: { avg: StatsLib.avg(timeOns), max: StatsLib.max(timeOns), min: StatsLib.min(timeOns) },
    timeOff: { avg: StatsLib.avg(timeOffs), max: StatsLib.max(timeOffs), min: StatsLib.min(timeOffs) },
    hoursOn: lastHoursOn,
    period: lastTimeOn + lastTimeOff,
    duty: { avg: StatsLib.avg(duties), max: StatsLib.max(duties), min: StatsLib.min(duties) },
    datetime: {
      avg: formatMsToTime(StatsLib.avg(diffs)),
      max: formatMsToTime(StatsLib.max(diffs)),
      min: formatMsToTime(StatsLib.min(diffs))
    },
    lastDate: lastDate,
    lastTime: lastTime
  };
};