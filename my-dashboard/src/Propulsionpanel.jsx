// ---------------------------------------------------------------
// Status pill — same visual language as SafetyStatusPanel's rows:
// dark box, label left, colored dot + word on the right.
// ---------------------------------------------------------------
function StatusPill({ label, status }) {
  const normalized = String(status).toUpperCase();

  const style = () => {
    switch (normalized) {
      case "READY":
      case "ENABLED":
      case "OK":
        return "text-emerald-400";
      case "FAULT":
      case "DISABLED":
      case "ERROR":
        return "text-red-400";
      default: // e.g. STANDBY, INIT
        return "text-amber-400";
    }
  };

  return (
    <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
      <span className="font-mono text-xs text-slate-400">{label}</span>
      <span className={`font-mono text-xs font-bold flex items-center gap-1.5 ${style()}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------
// PropulsionPanel — Subtasks 7.1 + 7.2
// ---------------------------------------------------------------
// Expects telemetryData to carry:
//   dcLinkVoltage        number (V)
//   driveCurrent         number (A)
//   motorControllerStatus string  ("READY" | "FAULT" | ...)
//   converterStatus       string  ("READY" | "FAULT" | ...)
//   propulsionStatus      string  ("ENABLED" | "DISABLED" | ...)
// ---------------------------------------------------------------
export default function PropulsionPanel({ telemetryData }) {
  const {
    dcLinkVoltage = 0,
    driveCurrent = 0,
    motorControllerStatus = "READY",
    converterStatus = "READY",
    propulsionStatus = "ENABLED",
  } = telemetryData || {};

  return (
    <div className="flex flex-col gap-2.5">
      {/* 7.1 — DC-Link voltage + 7.2 Drive current, plain stat boxes */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5">
          <div className="font-mono text-[10px] tracking-wider text-slate-500 uppercase mb-1">
            DC-Link Voltage
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
            {Number(dcLinkVoltage).toFixed(1)}
            <span className="text-sm text-slate-400 ml-1">V</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5">
          <div className="font-mono text-[10px] tracking-wider text-slate-500 uppercase mb-1">
            Drive Current
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
            {Number(driveCurrent).toFixed(1)}
            <span className="text-sm text-slate-400 ml-1">A</span>
          </div>
        </div>
      </div>

      {/* 7.2 — status pills */}
      <StatusPill label="Motor Controller" status={motorControllerStatus} />
      <StatusPill label="Converter" status={converterStatus} />
      <StatusPill label="Propulsion System" status={propulsionStatus} />
    </div>
  );
}