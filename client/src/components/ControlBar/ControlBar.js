import SumpChart from '../sumpTable/sumpChart';
import './ControlBar.css';

const ControlBar = ({ cl1pClick, selectedHours, onHoursChange, columnStats, sumpRecords, toggleGreenhouse,
                       isGreenhouseOpen, toggleSidebar, isSidebarOpen, serverTime }) => {
  const getOptions = (min, max) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
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
      <div className="brandSection">
        <div className="brand">Sump</div>
        <div className="serverTime"><span className="stLabel">Server Time:</span><span>{serverTime ?? "00:00:00"}</span></div>
      </div>

      <div className="centerSection">
        <div className="lastRun">
          <span className="label">Last Run</span>
          <span className="value">{columnStats?.lastTime ?? "N/a"} </span>
          <span className="unit">{columnStats?.lastDate ?? "N/a"}</span>
        </div>
        <div className="statsRow">
          <div className="statItem">
            <span className="label">On</span>
            <span className="value">{columnStats?.timeOn?.avg ?? 0}</span>
            <span className="unit">s</span>
          </div>
          <div className="statItem">
            <span className="label">Off</span>
            <span className="value">{columnStats?.timeOff?.avg ?? 0}</span>
            <span className="unit">m</span>
          </div>
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
            options={getOptions(0, 1024)}
          />
        </div>
        <div className="chartContainer">
          <div className="chartWatermark">STATS</div>
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
              label: "period", color: "cyan",
              data: sumpRecords.slice(1).map((r, i) => {
                const current = new Date(r.payload?.datetime).getTime();
                const previous = new Date(sumpRecords[i].payload?.datetime).getTime();
                return ( previous - current) / 60000;
              })}
            ]}
            options={getOptions(0, 100)}
          />
        </div>
      </div>

      <div className="menuSection">
        <button className="greenhouseButton" onClick={toggleGreenhouse}>
          {isGreenhouseOpen ? "Close Greenhouse" : "Greenhouse"}
        </button>
        <button className="cl1pButton" onClick={cl1pClick}>Cl1p</button>
        <select 
          className="selectedHours" 
          value={selectedHours} 
          onChange={(e) => onHoursChange(Number(e.target.value))}
        >
          <option value={1}>1h</option>
          <option value={6}>6h</option>
          <option value={12}>12h</option>
          <option value={24}>24h</option>
          <option value={48}>48h</option>
          <option value={168}>1w</option>
        </select>
        <button className="sidebarButton" onClick={toggleSidebar}>
          {isSidebarOpen ? "Close Stats" : "Stats"}
        </button>
      </div>
    </header>
  );
};

export default ControlBar;