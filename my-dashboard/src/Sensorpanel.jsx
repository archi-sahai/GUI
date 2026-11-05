import { useState, useEffect } from "react";

// ---------------------------------------------------------------
// SensorPanel: compact health (OK / FAULT) grid for every sensor.
// No slave headings; sensors are shown in the order listed below.
//
// sensors = { "RTD Sensor 1": { v: 31.2, t: 1730000000000 }, ... }
//   v = latest value, t = time it was received (ms since epoch)
//
// A sensor is:
//   NO DATA : no reading has ever arrived
//   FAULT   : no update for STALE_MS (dead), value invalid, or out of range
//   OK      : fresh and valid
// Hover a card to see the fault reason.
// ---------------------------------------------------------------

const STALE_MS = 3000; // no update for this long = dead

// min/max are plausible limits; outside = FAULT. Edit or remove if wrong.
// sim = base value used by the simulated feed in App.jsx.
export const SENSOR_GROUPS = [
  {
    slave: "Slave 1",
    sensors: [
      { name: "RTD Sensor 1", unit: "°C", min: -40, max: 150, sim: 30 },
      { name: "RTD Sensor 2", unit: "°C", min: -40, max: 150, sim: 31 },
      { name: "Hall Sensor 1", unit: "", sim: 2.5 },
      { name: "IMU Sensor 1", unit: "m/s²", sim: 9.8 },
    ],
  },
  {
    slave: "Slave 2",
    sensors: [
      { name: "DC-Link Voltage Sensor 1", unit: "V", min: 0, max: 500, sim: 20 },
    ],
  },
  {
    slave: "Slave 3",
    sensors: [
      { name: "LiDAR Sensor 1", unit: "m", min: 0, max: 200, sim: 12 },
      { name: "RTD Sensor 3", unit: "°C", min: -40, max: 150, sim: 32 },
      { name: "RTD Sensor 4", unit: "°C", min: -40, max: 150, sim: 33 },
      { name: "Pressure Sensor 1", unit: "kPa", min: 0, max: 200, sim: 101 },
    ],
  },
  {
    slave: "Slave 4",
    sensors: [
      { name: "LiDAR Sensor 2", unit: "m", min: 0, max: 200, sim: 13 },
      { name: "Hall Sensor 2", unit: "", sim: 2.5 },
      { name: "RTD Sensor 5", unit: "°C", min: -40, max: 150, sim: 34 },
      // TODO: add the remaining sensors from the rest of your list here.
    ],
  },
];

function evaluate(def, reading, now) {
  if (!reading) return { status: "NO DATA", reason: "no reading received yet" };
  if (typeof reading.v !== "number" || !Number.isFinite(reading.v))
    return { status: "FAULT", reason: "invalid value" };
  if (now - reading.t > STALE_MS)
    return { status: "FAULT", reason: "no update (dead)" };
  if (def.min != null && (reading.v < def.min || reading.v > def.max))
    return { status: "FAULT", reason: "out of range" };
  return { status: "OK", reason: "" };
}

const STYLE = {
  OK: { dot: "bg-emerald-400", text: "text-emerald-400", row: "border-slate-800/60 bg-slate-950/50" },
  FAULT: { dot: "bg-red-500", text: "text-red-400", row: "border-red-500/40 bg-red-950/60" },
  "NO DATA": { dot: "bg-slate-600", text: "text-slate-500", row: "border-slate-800/60 bg-slate-950/50" },
};

export default function SensorPanel({ sensors = {}, simulated = false, onToggleSim }) {
  const [now, setNow] = useState(Date.now());

  // Re-evaluate every second so a sensor that stops reporting turns FAULT
  // even when no new data arrives.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const items = SENSOR_GROUPS.flatMap((g) => g.sensors).map((def) => ({
    def,
    value: sensors[def.name]?.v,
    ...evaluate(def, sensors[def.name], now),
  }));

  const count = (s) => items.filter((i) => i.status === s).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[11px] font-mono">
        <span className="text-emerald-400">{count("OK")} OK</span>
        <span className={count("FAULT") ? "text-red-400 font-bold" : "text-slate-500"}>
          {count("FAULT")} FAULT
        </span>
        {count("NO DATA") > 0 && <span className="text-slate-500">{count("NO DATA")} NO DATA</span>}
        <span
          className={`ml-auto px-1.5 py-0.5 rounded text-[9px] border ${
            simulated
              ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
              : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
          }`}
        >
          {simulated ? "SIMULATED (click to kill)" : "LIVE"}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-1.5">
        {items.map(({ def, value, status, reason }) => {
          const st = STYLE[status];
          return (
            <div
              key={def.name}
              title={reason ? `${def.name}: ${reason}` : def.name}
              onClick={simulated && onToggleSim ? () => onToggleSim(def.name) : undefined}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${st.row} ${
                simulated && onToggleSim ? "cursor-pointer" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
              <span className="flex-1 min-w-0 truncate text-[11px] font-mono text-slate-300">
                {def.name}
              </span>
              <span className="flex-shrink-0 text-[11px] font-mono font-semibold text-slate-100">
                {typeof value === "number" && status !== "NO DATA" ? value.toFixed(1) : "--"}
                {def.unit && <span className="text-slate-500 ml-0.5">{def.unit}</span>}
              </span>
              <span className={`flex-shrink-0 w-12 text-right text-[10px] font-mono font-bold ${st.text}`}>
                {status === "NO DATA" ? "N/A" : status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}