// TEMPORARY rebuild. The logic below is GUESSED from how App.jsx and
// ControlCenter.jsx use the hook. It is NOT your original.
export function useSystemState(raw) {
  const latencyKeys = [
    "estopLatencyMs", "elecLatencyMs", "propulsionLatencyMs",
    "embeddedLatencyMs", "mechLatencyMs",
  ];
  const latencyFault = latencyKeys.some((k) => raw[k] > 100); // 100 ms limit from your App.jsx comments

  const sdcStatus = raw.sdcClosed ? "Closed" : "Open";
  const ebsPosition = raw.ebsDeployed ? "Deployed" : "Retracted";
  const hvcContactors = raw.hvEnabled ? "Closed" : "Open";
  const hvCurrentSafe = true; // GUESS: placeholder, not a real safety check

  let currentState = "IDLE";
  if (raw.emergencyStop) currentState = "EMERGENCY";
  else if (raw.maintenanceMode) currentState = "MAINTENANCE";
  else if (raw.hvEnabled) currentState = "HV ACTIVE";

  return {
    ...raw,
    currentState,
    sdcStatus,
    ebsPosition,
    hvcContactors,
    hvCurrentSafe,
    latencyFault,
    systemFaults: raw.systemFaults ?? [],
  };
}