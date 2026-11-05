// ---------------------------------------------------------------
// LvBatteryPanel — Hour 5 (Low-Voltage battery variant)
// ---------------------------------------------------------------
// Subtask 5.1: state-of-charge, shown as text only (no battery icon).
// Subtask 5.2: data grid for pack-level metrics.

// Color threshold logic, isolated in one function so it's not repeated.
function getSocColor(soc) {
  if (soc > 50) return "#34d399"; // emerald-400
  if (soc > 20) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

// Battery graphic removed — SOC is now a large text readout that
// fills the vertical space the icon used to take up.
function SocReadout({ soc = 0 }) {
  const fillColor = getSocColor(soc);

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 py-2">
      <span className="font-mono text-3xl font-bold" style={{ color: fillColor }}>
        {soc}%
      </span>
      <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">
        State of Charge
      </span>
    </div>
  );
}

function MetricCell({ label, value, unit = "" }) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg px-3 py-2 flex flex-col">
      <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">
        {label}
      </span>
      <span className="text-slate-100 text-sm font-mono font-semibold">
        {value}
        {unit && <span className="text-slate-500 text-xs ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

export default function LvBatteryPanel({ telemetryData = {} }) {
  
  const {
    lvsoc = 0,
    lvpackVoltage = 0,
    lvpackCurrent = 0,
    lvmaxCellVoltage = 0,
    lvminCellVoltage = 0,
    lvmaxCellTemp = 0,
    lvminCellTemp = 0,
    lvBmsStatus = "NO DATA",
    lvfaultFlags = [],
  } = telemetryData;

  const metrics = [
    { label: "Pack Voltage", value: lvpackVoltage, unit: "V" },
    { label: "Pack Current", value: lvpackCurrent, unit: "A" },
    { label: "Max Cell Voltage", value: lvmaxCellVoltage, unit: "V" },
    { label: "Min Cell Voltage", value: lvminCellVoltage, unit: "V" },
    { label: "Max Cell Temp", value: lvmaxCellTemp, unit: "°C" },
    { label: "Min Cell Temp", value: lvminCellTemp, unit: "°C" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Passing our "lvsoc" variable in as the "soc" prop SocReadout expects */}
      <SocReadout soc={lvsoc} />

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <MetricCell key={m.label} {...m} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-xs font-mono text-slate-500">BMS Status</span>
                <span
          className={`text-xs font-mono font-semibold ${
            lvBmsStatus === "OK" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {lvBmsStatus}
        </span>
      </div>

      {lvfaultFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lvfaultFlags.map((flag) => (
            <span
              key={flag}
              className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[10px] font-mono"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}