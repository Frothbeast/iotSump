import SumpChart from '../sumpTable/sumpChart';
import './ControlBar.css';

const ControlBar = ({ selectedHours, onHoursChange, columnStats, sumpRecords, toggleSidebar, isSidebarOpen }) => {
  const getOptions = (min, max) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    layout: {
      padding: 0
    },
    scales: {
      x: {
        display: false,
        reverse: true
      },
      y: {
        display: false,
        min: min,
        max: max
      }
    },
    elements: {
      point: {
        radius: 0
      }
    }
  });

  return (
    <header className="controlBar">
      <div className="brand">Sump</div>
      <div className="centerSection">
        <div className="lastRun">Last Run: {columnStats?.lastDatetime ?? "N/a"}</div>
        <div className="lastRunPeriod">Last Period: {(columnStats?.timeOff ?? 0) + (columnStats?.timeOn ?? 0)} seconds</div>
        <div className="hoursSincePowerup">Last Period: {columnStats?.hoursOn ?? 0} hours</div>
        <div className="buttonRow">
          <button className="sidebarButton" onClick={toggleSidebar}>
            {isSidebarOpen ? "Close Chart" : "View Graph"}
          </button>
          <select className="selectedHours" value={selectedHours} onChange={(e) => onHoursChange(Number(e.target.value))}>
            <option value={1}>Hour</option>
            <option value={24}>Day</option>
            <option value={168}>Week</option>
          </select>
        </div>
      </div>
      <div className="chartSection">
        <div className="chartContainer">
          <div className="chartWatermark">ADC</div>
          <SumpChart
            labels={sumpRecords.map((_, i) => i)}
            datasets={[
              {
                label: "Ladc",
                color: "lightblue",
                data: sumpRecords.map(r => r.payload?.Ladc),
              },
              {
                label: "Hadc",
                color: "lightgreen",
                data: sumpRecords.map(r => r.payload?.Hadc),
              }
            ]}
            options={getOptions(400, 1024)}
          />
        </div>
        <div className="chartContainer">
          <div className="chartWatermark">TIME</div>
          <SumpChart
            labels={sumpRecords.map((_, i) => i)}
            datasets={[
              {
                label: "timeOn",
                color: "pink",
                data: sumpRecords.map(r => r.payload?.timeOn),
              },
              {
                label: "timeOff",
                color: "yellow",
                data: sumpRecords.map(r => r.payload?.timeOff),
              }
            ]}
            options={getOptions(0, 3500)}
          />
        </div>
        <div className="chartContainer">
          <div className="chartWatermark">DUTY</div>
          <SumpChart
            labels={sumpRecords.map((_, i) => i)}
            datasets={[
              {
                label: "duty",
                color: "lavender",
                data: sumpRecords.map(r => r.payload?.duty)
              }
            ]}
            options={getOptions(-1, 99)}
          />
        </div>
        <div className="chartContainer">
          <div className="chartWatermark">PERIOD</div>
          <SumpChart
            labels={sumpRecords.map((_, i) => i)}
            datasets={[{
              label: "period",color: "cyan",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return ( previous -current) / 60000;
              })}
            ]}
            options={getOptions(0, 100)}
          />
        </div>
      </div>
    </header>
  );
};

export default ControlBar;