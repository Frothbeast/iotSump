const StatsLib = {
  avg: (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0,
  max: (arr) => arr.length ? Math.max(...arr) : 0,
  min: (arr) => arr.length ? Math.min(...arr) : 0,
};

const formatMsToTime = (ms) => {
  const totalMs = Math.abs(Number(ms) || 0);
  const h = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const m = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const calculateColumnStats = (sumpRecords) => {
  if (!Array.isArray(sumpRecords) || sumpRecords.length === 0) return null;

  const Hadcs = sumpRecords.map(r => parseFloat(r.Hadc)).filter(v => !isNaN(v));
  const Ladcs = sumpRecords.map(r => parseFloat(r.Ladc)).filter(v => !isNaN(v));
  const timeOns = sumpRecords.map(r => parseFloat(r.timeOn)).filter(v => !isNaN(v));
  const timeOffs = sumpRecords.map(r => parseFloat(r.timeOff)).filter(v => !isNaN(v));
  const hoursOns = sumpRecords.map(r => parseFloat(r.hoursOn)).filter(v => !isNaN(v));
  const duties = sumpRecords.map(r => parseFloat(r.duty)).filter(v => !isNaN(v));

  const lastRecord = sumpRecords[0];
  const dateObjs = sumpRecords.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));
  const diffs = dateObjs.length > 1 ? dateObjs.slice(0, -1).map((v, i) => v - dateObjs[i + 1]) : [];

  const tsString = String(lastRecord?.timestamp || "");
  const parts = tsString.split(/[ T]/);
  const lastDate = parts[0] || "";
  const lastTime = lastRecord?.timestamp ? 
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