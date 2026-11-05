import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function CommunicationStatus({
  communication = {},
  braking = false,
}) {
  const telemetryToMaster = communication.telemetryToMaster === true;
  const masterToPilot = communication.masterToPilot === true;

  let status = "Healthy";
  let statusType = "healthy";

  if (braking) {
    status = "BRAKING IN PROCESS";
    statusType = "braking";
  } else if (!telemetryToMaster) {
    status = "Communication lost with the pod";
    statusType = "pod";
  } else if (!masterToPilot) {
    status = "Communication lost with the Master";
    statusType = "master";
  }

  const styles = {
    healthy: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/20",
      text: "text-emerald-400",
    },
    braking: {
      border: "border-amber-500/60",
      bg: "bg-amber-950/20",
      text: "text-amber-400",
    },
    pod: {
      border: "border-red-500/60",
      bg: "bg-red-950/20",
      text: "text-red-400",
    },
    master: {
      border: "border-red-500/60",
      bg: "bg-red-950/20",
      text: "text-red-400",
    },
  };

  const style = styles[statusType];

  return (
    <div
      className={`col-span-12 rounded-xl border ${style.border} ${style.bg}
                  px-5 py-3 transition-all duration-300`}
    >
      <div className="flex items-center gap-4">

        {/* ICON */}
        <div className={`flex-shrink-0 ${style.text}`}>
          {statusType === "healthy" && (
            <CheckCircle className="w-7 h-7" />
          )}

          {statusType === "braking" && (
            <AlertTriangle className="w-7 h-7 animate-pulse" />
          )}

          {(statusType === "pod" || statusType === "master") && (
            <XCircle className="w-7 h-7" />
          )}
        </div>

        {/* STATUS */}
        <div className="min-w-[260px]">
          <div className="font-mono text-[11px] tracking-widest text-slate-400 uppercase">
            Communication Status
          </div>

          <div className={`font-mono font-bold text-lg ${style.text}`}>
            {status}
          </div>
        </div>

        {/* CONNECTION FLOW */}
        <div className="flex-1 flex items-center justify-center gap-4">

          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] text-slate-500">
              MASTER
            </span>

            <span
              className={`w-3 h-3 rounded-full mt-1 ${
                telemetryToMaster
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              }`}
            />
          </div>

          <span
            className={
              telemetryToMaster
                ? "text-emerald-400 text-xl"
                : "text-red-500 text-xl"
            }
          >
            ←→
          </span>

          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] text-slate-500">
              TELEMETRY
            </span>

            <span
              className={`w-3 h-3 rounded-full mt-1 ${
                telemetryToMaster && masterToPilot
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              }`}
            />
          </div>

          <span
            className={
              masterToPilot
                ? "text-emerald-400 text-xl"
                : "text-red-500 text-xl"
            }
          >
            ←→
          </span>

          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] text-slate-500">
              PILOT
            </span>

            <span
              className={`w-3 h-3 rounded-full mt-1 ${
                masterToPilot
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              }`}
            />
          </div>
        </div>

        {/* LIVE INDICATOR */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-700 pl-5">
          <Activity
            className={`w-5 h-5 ${style.text}`}
          />

          <div>
            <div className={`font-mono text-xs font-bold ${style.text}`}>
              {statusType === "healthy"
                ? "LIVE DATA FLOW"
                : statusType === "braking"
                ? "BRAKE COMMAND SENT"
                : "LINK FAULT"}
            </div>

            <div className="font-mono text-[9px] text-slate-500">
              MASTER ←→ TELEMETRY ←→ PILOT
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}