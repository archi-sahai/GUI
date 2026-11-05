import { useState, useEffect } from "react";
import { Wifi } from "lucide-react";
import SafetyStatusPanel from "./SafetyStatusPanel";
import { STATE_REQUIREMENTS } from "./stateRequirements";
import EStopButton from "./EStopButton";
import BatteryPanel from "./BatteryPanel";
import LvBatteryPanel from "./LvBatteryPanel";
import PropulsionPanel from "./PropulsionPanel";
import CommHeartbeatPanel from "./Commonheartbeatpanel";
import { Thermometer, ShieldCheck, Navigation } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import CommunicationStatus from "./CommunicationStatus";
import SensorPanel from "./Sensorpanel";
// ---------------------------------------------------------------
// TOP NAV BAR
// ---------------------------------------------------------------
function TopNav() {
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeString = now.toLocaleTimeString("en-US", { hour12: false });
  const dateString = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 mb-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm tracking-wider text-slate-300">LoopMIT</span>
      </div>

      <div className="flex flex-col items-center leading-none">
        <span className="font-mono text-lg tracking-widest text-slate-100">{timeString}</span>
        <span className="font-mono text-[11px] text-slate-500 mt-1">{dateString}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Wifi className="w-3.5 h-3.5" />
          SYNC OK
        </div>
        <ThemeToggle />

        <button
          onClick={() => setOnline((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-500"}`}
          />
          {online ? "ONLINE" : "OFFLINE"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// SYSTEM STATUS WIDGET
// ---------------------------------------------------------------
function SystemStatus({
  currentState = "DEMO",
  sdcStatus = "Closed",
  ebsPosition = "Retracted",
  hvcContactors = "Closed",
  hvCurrentSafe = true,
  onStateChange,
}) {
  const states = ["IDLE", "MAINTENANCE", "HV ACTIVE", "DEMO", "EMERGENCY"];

  const getStateStyle = (state, isActive) => {
    if (!isActive) {
      return "bg-slate-950/40 text-slate-600 border-slate-800/60 opacity-40";
    }

    switch (state) {
      case "EMERGENCY":
        return "bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.35)]";
      case "HV ACTIVE":
        return "bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]";
      case "DEMO":
        return "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]";
      case "MAINTENANCE":
        return "bg-purple-950/80 border-purple-500 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]";
      default:
        return "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)]";
    }
  };

  const activeRequirements = STATE_REQUIREMENTS[currentState.toUpperCase()] || [];

  return (
    <div className="flex flex-col justify-between h-full pt-1">
      <div className="flex flex-wrap gap-1.5 justify-start">
        {states.map((state) => {
          const isActive = state === currentState.toUpperCase();
          const isEmergency = state === "EMERGENCY";

          return (
            <button
              key={state}
              disabled={isEmergency}
              onClick={() => {
                if (!isEmergency && onStateChange) {
                  onStateChange(state);
                }
              }}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold tracking-wide transition-all duration-300 ${
                isEmergency ? "cursor-not-allowed" : "cursor-pointer"
              } ${getStateStyle(state, isActive)}`}
            >
              {state}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
        {activeRequirements.map((req) => {
          const isMet = req.check({ sdcStatus, ebsPosition, hvcContactors, hvCurrentSafe });
          return (
            <div key={req.text} className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isMet ? "bg-emerald-400" : "bg-red-500"
                }`}
              />
              <span className={isMet ? "text-slate-400" : "text-red-400"}>{req.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// MASTER GRID SHELL
// ---------------------------------------------------------------
const SPAN_CLASSES = {
  4: "md:col-span-4",
  6: "md:col-span-6",
  8: "md:col-span-8",
  12: "md:col-span-12",
};

function Panel({ title, span = 4, height = "h-auto", children }) {
  return (
    <div
      className={`col-span-12 ${SPAN_CLASSES[span]} bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col ${height}`}
    >
      <h3 className="font-mono text-xs tracking-wider text-slate-400 uppercase mb-3 flex-shrink-0">
        {title}
      </h3>

      <div className="flex-1 min-h-0">
        {children ? (
          children
        ) : (
          <div className="text-slate-600 text-xs font-mono">// widget goes here</div>
        )}
      </div>
    </div>
  );
}

export default function ControlCenter({
  telemetryData,
  onEmergencyTrigger,
  onStateChange,
  onLatencyMeasured,
  onHeartbeatLoss,
  onSetChannel,
  sidebarData,        // temps / IMU data (used for the live summary on the buttons)
  integrityVerdict,   // "PASS" | "WARN" | "FAIL" | "NO RUN"
  onNavigate,         // (page) => void, "temps" | "integrity" | "imu" | "main"
  sensors,            // NEW
  sensorsSimulated,   // NEW
  onToggleSensor, 
  brakingInProcess,    // NEW
})  // (page) => void, "temps" | "integrity" | "imu" | "main"
 {
  const maxTemp = Array.isArray(sidebarData?.temps)
    ? Math.max(...sidebarData.temps.filter((v) => typeof v === "number"))
    : null;
  const velocity = sidebarData?.imu?.velocity;
  const verdictColor = {
    PASS: "text-emerald-400",
    WARN: "text-amber-400",
    FAIL: "text-red-400",
  };

  // Safe fallback to prevent undefined reads if data hasn't loaded
  const telemetry = telemetryData || {};

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4">
      <TopNav />

      <div className="grid grid-cols-12 gap-4">
        {/* System status panel */}
        <Panel title="System status" span={4}>
          <SystemStatus
            currentState={telemetry?.currentState}
            sdcStatus={telemetry?.sdcStatus}
            ebsPosition={telemetry?.ebsPosition}
            hvcContactors={telemetry?.hvcContactors}
            hvCurrentSafe={telemetry?.hvCurrentSafe}
            onStateChange={onStateChange}
          />
        </Panel>

        {/* Emergency control panel */}
        <Panel title="Emergency control" span={4}>
          <EStopButton
            onTrigger={onEmergencyTrigger}
            currentState={telemetry?.currentState}
            onLatencyMeasured={onLatencyMeasured}
            displayLatencyMs={telemetry?.estopLatencyMs}
          />
        </Panel>

        {/* Safety status panel */}
        <Panel title="Safety status" span={4}>
  <SafetyStatusPanel telemetryData={telemetry} />
</Panel>

{/* ---------------------------------------------------------
    COMMUNICATION STATUS
---------------------------------------------------------- */}

<CommunicationStatus
  communication={telemetry?.communication}
  braking={brakingInProcess}
/>

{/* HV Battery panel */}
<Panel title="HV Battery" span={4}>
  <BatteryPanel
    telemetryData={telemetry}
    onSetChannel={onSetChannel}
  />
</Panel>

        {/* LV Battery panel */}
        <Panel title="LV Battery" span={4}>
          <LvBatteryPanel telemetryData={telemetry} />
        </Panel>

        {/* Propulsion panel */}
        <Panel title="Propulsion & DC-Link" span={4}>
          <PropulsionPanel telemetryData={telemetry} />
        </Panel>

        {/* Communication panel */}
          <Panel title="Communication & Heartbeat" span={4}>
          <CommHeartbeatPanel
            links={telemetry?.links}
            systemFaults={telemetry?.systemFaults}
            onHeartbeatLoss={onHeartbeatLoss}
          />
        </Panel>
        {/*Sensor panel*/}
        <Panel title="Sensors" span={8}>
          <SensorPanel sensors={sensors} simulated={sensorsSimulated} onToggleSim={onToggleSensor} />
        </Panel>

        {/* Diagnostics: each button opens a full page with a way back */}
        <Panel title="Diagnostics" span={12}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: "temps",
                label: "Temperatures",
                Icon: Thermometer,
                summary:
                  typeof maxTemp === "number" && Number.isFinite(maxTemp)
                    ? `max ${maxTemp.toFixed(1)} °C`
                    : "NO DATA",
                color: "text-slate-300",
              },
              {
                id: "integrity",
                label: "Integrity",
                Icon: ShieldCheck,
                summary: integrityVerdict || "NO RUN",
                color: verdictColor[integrityVerdict] || "text-slate-500",
              },
              {
                id: "imu",
                label: "IMU",
                Icon: Navigation,
                summary:
                  typeof velocity === "number" ? `${velocity.toFixed(1)} m/s` : "NO DATA",
                color: "text-slate-300",
              },
            ].map(({ id, label, Icon, summary, color }) => (
              <button
                key={id}
                onClick={() => onNavigate && onNavigate(id)}
                className="flex items-center gap-5 text-left px-6 py-7 rounded-xl border-2 border-slate-700 bg-slate-950/50 hover:border-cyan-500 hover:bg-slate-900 active:scale-[0.98] transition-all"
              >
                <Icon className="w-10 h-10 text-cyan-400 flex-shrink-0" />
                <span className="flex flex-col gap-1">
                  <span className="font-mono text-xl text-slate-100">{label}</span>
                  <span className={`font-mono text-base ${color}`}>{summary}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}