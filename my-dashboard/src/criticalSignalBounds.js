// ---------------------------------------------------------------
// criticalSignalBounds.js
// ---------------------------------------------------------------
// "System critical signals" per spec: all commands/data received
// from (1) motor controllers or converters, (2) the batteries,
// and (3) the emergency braking system.
//
// This module is the single source of truth for what "acceptable"
// means for each of those signals, and exposes one function —
// checkCriticalSignals() — that the prototype itself runs on every
// telemetry update to decide whether to force EMERGENCY + open SDC.
// It does NOT depend on any UI trigger being pressed; it's a pure
// function of the current values.
//
// TUNE THESE to your actual hardware limits — these are placeholder
// bounds so the check has real numbers to compare against.
// ---------------------------------------------------------------

export const BOUNDS = {
  // --- Battery (HV + LV) ---
  packVoltage: { min: 250, max: 450 },
  cellVoltage: { min: 2.5, max: 4.25 },
  cellTemp: { min: -10, max: 60 },

  // --- Motor controller / converter (propulsion + DC-link) ---
  dcLinkVoltage: { min: 0, max: 60 },
  driveCurrent: { min: -300, max: 300 },
};

// Status-style signals: only these string values are "acceptable".
// Anything else (FAULT, DISABLED, unknown, missing) is a violation.
const OK_STATUS_VALUES = new Set(["READY", "ENABLED", "OK", "RETRACTED", "DEPLOYED"]);

function inBounds(value, { min, max }) {
  return typeof value === "number" && !Number.isNaN(value) && value >= min && value <= max;
}

function isOkStatus(value) {
  return OK_STATUS_VALUES.has(String(value).toUpperCase());
}

/**
 * Runs every system-critical signal against its bounds.
 * Returns { ok: boolean, violations: [{ signal, value, reason }] }.
 */
export function checkCriticalSignals({
  // Battery (HV)
  packVoltage,
  maxCellVoltage,
  minCellVoltage,
  maxCellTemp,
  minCellTemp,
  bmsStatus,
  // Battery (LV)
  lvpackVoltage,
  lvmaxCellVoltage,
  lvminCellVoltage,
  lvmaxCellTemp,
  lvminCellTemp,
  lvbmsStatus,
  // Motor controller / converter
  dcLinkVoltage,
  driveCurrent,
  motorControllerStatus,
  converterStatus,
  // Emergency braking system
  ebsStatus,
} = {}) {
  const violations = [];

  const check = (signal, value, bounds) => {
    if (!inBounds(value, bounds)) {
      violations.push({ signal, value, reason: `outside ${bounds.min}-${bounds.max}` });
    }
  };
  const checkStatus = (signal, value) => {
    if (!isOkStatus(value)) {
      violations.push({ signal, value, reason: "non-nominal status" });
    }
  };

  // Batteries
  check("HV Pack Voltage", packVoltage, BOUNDS.packVoltage);
  check("HV Max Cell Voltage", maxCellVoltage, BOUNDS.cellVoltage);
  check("HV Min Cell Voltage", minCellVoltage, BOUNDS.cellVoltage);
  check("HV Max Cell Temp", maxCellTemp, BOUNDS.cellTemp);
  check("HV Min Cell Temp", minCellTemp, BOUNDS.cellTemp);
  checkStatus("HV BMS Status", bmsStatus);

  check("LV Pack Voltage", lvpackVoltage, BOUNDS.packVoltage);
  check("LV Max Cell Voltage", lvmaxCellVoltage, BOUNDS.cellVoltage);
  check("LV Min Cell Voltage", lvminCellVoltage, BOUNDS.cellVoltage);
  check("LV Max Cell Temp", lvmaxCellTemp, BOUNDS.cellTemp);
  check("LV Min Cell Temp", lvminCellTemp, BOUNDS.cellTemp);
  checkStatus("LV BMS Status", lvbmsStatus);

  // Motor controller / converter
  check("DC-Link Voltage", dcLinkVoltage, BOUNDS.dcLinkVoltage);
  check("Drive Current", driveCurrent, BOUNDS.driveCurrent);
  checkStatus("Motor Controller", motorControllerStatus);
  checkStatus("Converter", converterStatus);

  // Emergency braking system
  checkStatus("Emergency Braking System", ebsStatus);

  return { ok: violations.length === 0, violations };
}