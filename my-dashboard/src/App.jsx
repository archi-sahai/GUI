import { useState, useEffect } from "react";
import ControlCenter from "./ControlCenter";
import { useSystemState } from "./useSystemState";
import { useBmsSocket } from "./useBmsSocket";
import DiagnosticsPage, { useHashPage, useSideRecorder } from "./SidePages";
import "./theme.css";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const LATENCY_LIMIT_MS = 100;
const LATENCY_KEYS = [
  "estopLatencyMs",
  "elecLatencyMs",
  "propulsionLatencyMs",
  "embeddedLatencyMs",
  "mechLatencyMs",
];

function App() {
  const [selectedState, setSelectedState] = useState(null);
  const [brakingInProcess, setBrakingInProcess] = useState(false);
  // -------------------------------------------------------------
  // LIVE BMS CONNECTION
  // -------------------------------------------------------------

  const {
  bmsData,
  communication,
  brakeApplied,
  sendChannelCommand,
  sendEmergencyCommand,
} = useBmsSocket();

  // -------------------------------------------------------------
  // INITIAL SYSTEM TELEMETRY
  //
  // BMS values start at 0 (NOT simulated). Once the BMS sends a
  // value, bmsData overwrites the 0.
  // -------------------------------------------------------------

  const [rawTelemetry, setRawTelemetry] = useState({
    // SYSTEM STATE
    emergencyStop: false,
    hvEnabled: false,
    maintenanceMode: false,

    sdcClosed: true,
    ebsDeployed: false,

    hvalGreen: true,
    hvalRed: false,

    imdStatus: "OK",

    // HV BMS DATA
    soc: 0,

    packVoltage: 0,
    packCurrent: 0,

    maxCellVoltage: 0,
    minCellVoltage: 0,

    maxCellTemp: 0,
    minCellTemp: 0,

    bmsStatus: "NO DATA",

    faultFlags: [],

    channelLiveOn: false,

    // LV BATTERY
    lvsoc: 0,
    lvpackVoltage: 0,
    lvpackCurrent: 0,
    lvmaxCellVoltage: 0,
    lvminCellVoltage: 0,
    lvmaxCellTemp: 0,
    lvminCellTemp: 0,
    lvfaultFlags: [],
    lvBmsStatus: "NO DATA",

    // PROPULSION / DC LINK
    dcLinkVoltage: 20,
    driveCurrent: 45.2,

    motorControllerStatus: "READY",
    converterStatus: "READY",
    propulsionStatus: "ENABLED",

    // LATENCIES
    estopLatencyMs: 25,
    elecLatencyMs: 20,
    propulsionLatencyMs: 10,
    embeddedLatencyMs: 50,
    mechLatencyMs: 30,

    // COMMUNICATION HEARTBEATS
    links: [
      { name: "Electrical SYS", lastHeartbeat: Date.now() },
      { name: "Propulsion System", lastHeartbeat: Date.now() },
      { name: "Embedded SYS", lastHeartbeat: Date.now() },
      { name: "Mech SYS", lastHeartbeat: Date.now() },
    ],
  });

  // -------------------------------------------------------------
  // HEARTBEAT UPDATE
  // -------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => {
      setRawTelemetry((prev) => ({
        ...prev,
        links: prev.links.map((link) => ({
          ...link,
          lastHeartbeat: Date.now(),
        })),
      }));
    }, 60);

    return () => clearInterval(id);
  }, []);
  
  // -------------------------------------------------------------
  // SIDEBAR DATA (temps + IMU) - SIMULATED
  //
  // The fake run repeats every 40 s so the Integrity panel can
  // complete a run and show a verdict:
  //    0-10 s  accelerate  (+2 m/s^2)
  //   10-20 s  coast
  //   20-30 s  brake       (-2 m/s^2, stops at 0)
  //   30-40 s  stationary  (lets the run end -> analysis)
  //
  // Replace this block with your real sensor feed later and set
  // tempsSimulated / imuSimulated to false.
  // -------------------------------------------------------------

  const [sideData, setSideData] = useState({
    temps: null,
    imu: null,
    tempsSimulated: true,
    imuSimulated: true,
  });

  useEffect(() => {
    let tick = 0;
    let pos = 0;
    let vel = 0;

    const id = setInterval(() => {
      const phase = tick % 40;
      if (phase === 0) {
        pos = 0;
        vel = 0;
      }

      let a = 0;
      if (phase < 10) a = 2;
      else if (phase < 20) a = 0;
      else if (phase < 30) a = vel > 0 ? -2 : 0;
      else a = 0;

      vel = Math.max(0, vel + a); // dt = 1 s
      pos += vel;
      tick += 1;

      setSideData((p) => ({
        ...p,
        temps: [0, 1, 2, 3, 4, 5].map((i) =>
          +(30 + i * 1.5 + Math.random() * 2).toFixed(1)
        ),
        imu: {
          ax: a,
          ay: 0,
          az: 9.81,
          roll: 0,
          pitch: 0,
          yaw: 0,
          velocity: vel,
          position: pos,
        },
      }));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------------------
  // PAGE ROUTING + RECORDER
  //
  // Recorder lives here (App is always mounted) so temperature
  // history and run recording continue while you are on any page.
  // -------------------------------------------------------------

  const [page, setPage] = useHashPage();
  const recorder = useSideRecorder(sideData, 1000);

  // -------------------------------------------------------------
  // SIMULATION (non-BMS values only)
  // -------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => {
      setRawTelemetry((prev) => ({
        ...prev,

        // PROPULSION
        driveCurrent: +clamp(
          prev.driveCurrent + (Math.random() - 0.5) * 1.5,
          0,
          100
        ).toFixed(1),

        dcLinkVoltage: +clamp(
          prev.dcLinkVoltage + (Math.random() - 0.5) * 4,
          0,
          450
        ).toFixed(1),
      }));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------------------
  // MERGE BMS DATA (bmsData overwrites the initial 0s)
  // -------------------------------------------------------------

  const telemetry = useSystemState({
    ...rawTelemetry,
    ...bmsData,
  });

  // -------------------------------------------------------------
  // DISPLAYED SYSTEM STATE
  //
  // A latched latency fault forces EMERGENCY. Clicking a state
  // button acknowledges the fault (see handleStateChange), so the
  // buttons are never stuck.
  // -------------------------------------------------------------

  const displayedState = telemetry.latencyFault
    ? "EMERGENCY"
    : selectedState !== null
    ? selectedState
    : telemetry.currentState;

  // -------------------------------------------------------------
  // STATE BUTTON CLICK
  //
  // Choosing a state acknowledges a latched latency fault: any
  // latency reading above the limit is reset, then the state is
  // applied. The next E-stop press re-measures real latency, and
  // if it is still over the limit the fault trips again.
  // -------------------------------------------------------------

  const handleStateChange = (state) => {
    setRawTelemetry((prev) => {
      const next = { ...prev };
      LATENCY_KEYS.forEach((k) => {
        if (next[k] > LATENCY_LIMIT_MS) next[k] = 0;
      });
      return next;
    });
    setSelectedState(state);
  };

  // -------------------------------------------------------------
  // EMERGENCY
  // -------------------------------------------------------------

  const handleEmergencyTrigger = () => {
  // Immediately show emergency locally
  setRawTelemetry((prev) => ({
    ...prev,
    emergencyStop: true,
  }));

  setSelectedState("EMERGENCY");

  // Show BRAKING IN PROCESS
  setBrakingInProcess(true);

  // Send actual braking command to Master
  sendEmergencyCommand();
};
useEffect(() => {
  if (brakeApplied) {
    setBrakingInProcess(false);
  }
}, [brakeApplied]);
  // -------------------------------------------------------------
  // E-STOP LATENCY
  // -------------------------------------------------------------

  const handleLatencyMeasured = (elapsedMs) => {
    setRawTelemetry((prev) => ({
      ...prev,
      estopLatencyMs: elapsedMs,
      emergencyStop: elapsedMs > LATENCY_LIMIT_MS ? true : prev.emergencyStop,
    }));

    if (elapsedMs > LATENCY_LIMIT_MS) {
      setSelectedState("EMERGENCY");
    }
  };

  // -------------------------------------------------------------
  // HEARTBEAT LOSS
  // -------------------------------------------------------------

  const handleHeartbeatLoss = () => {
    setRawTelemetry((prev) => ({ ...prev, emergencyStop: true }));
    setSelectedState("EMERGENCY");
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  if (page !== "main") {
    return (
      <DiagnosticsPage
        page={page}
        data={sideData}
        recorder={recorder}
        onNavigate={setPage}
      />
    );
  }

  return (
    <ControlCenter
  telemetryData={{
    ...telemetry,
    currentState: displayedState,
    communication,
  }}
      brakingInProcess={brakingInProcess}
      onEmergencyTrigger={handleEmergencyTrigger}
      onStateChange={handleStateChange}
      onLatencyMeasured={handleLatencyMeasured}
      onHeartbeatLoss={handleHeartbeatLoss}
      onSetChannel={sendChannelCommand}
      sidebarData={sideData}
      integrityVerdict={recorder.report?.verdict ?? "NO RUN"}
      onNavigate={setPage}
    />
  );
}

export default App;