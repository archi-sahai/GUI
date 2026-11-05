// ---------------------------------------------------------------
// stateRequirements.js
// ---------------------------------------------------------------
// One lookup table: for each state, what conditions MUST be true.
// Each requirement has:
//   - text: what to display
//   - check(telemetry): returns true/false — does the CURRENT telemetry
//     actually satisfy this requirement right now?
//
// This lets the UI not just describe the rule, but flag it red if
// live data contradicts it (e.g. system claims IDLE but SDC is
// actually closed — that's worth a technician noticing).
export const STATE_REQUIREMENTS = {
  IDLE: [
    { text: "SDC is open", check: (t) => t.sdcStatus === "Open" },
    { text: "Emergency brakes are deployed", check: (t) => t.ebsPosition === "Deployed" },
  ],
  MAINTENANCE: [
    {
      text: "HVCs and pre-charge relay(s) are open",
      check: (t) => t.hvcContactors === "Open",
    },
    {
      text: "Emergency brakes are retracted / not deployed",
      check: (t) => t.ebsPosition === "Retracted",
    },
  ],
  "HV ACTIVE": [
    { text: "SDC is closed", check: (t) => t.sdcStatus === "Closed" },
    {
      text: "No current drawn from the HV battery",
      // Placeholder: wire this to a real "current draw" telemetry
      // field once you have one, e.g. t.hvCurrentDraw === 0
      check: (t) => t.hvCurrentSafe !== false,
    },
  ],
  DEMO: [
    { text: "SDC is closed", check: (t) => t.sdcStatus === "Closed" },
    {
      text: "Emergency brakes are retracted / not deployed",
      check: (t) => t.ebsPosition === "Retracted",
    },
  ],
  EMERGENCY: [
    { text: "SDC is open", check: (t) => t.sdcStatus === "Open" },
    { text: "Emergency brakes are deployed", check: (t) => t.ebsPosition === "Deployed" },
  ],
};