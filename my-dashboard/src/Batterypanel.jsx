
// ---------------------------------------------------------------
// BatteryPanel — Hour 5
// ---------------------------------------------------------------
// BMS values come from telemetryData.
//
// CHANNEL CONTROL:
//   - ON/OFF buttons are directly clickable.
//   - Clicking ON immediately selects ON in the GUI.
//   - Clicking OFF immediately selects OFF in the GUI.
//   - The selected command is sent to Bun -> ESP32.
//   - channelLiveOn remains separate and shows actual BMS feedback.
// ---------------------------------------------------------------

import { useEffect, useState } from "react";

// ---------------------------------------------------------------
// SOC COLOR
// ---------------------------------------------------------------

function getSocColor(soc) {
  if (soc > 50) return "#34d399";
  if (soc > 20) return "#fbbf24";
  return "#f87171";
}

// ---------------------------------------------------------------
// SOC READOUT
// ---------------------------------------------------------------

function SocReadout({ soc = 0 }) {
  const fillColor = getSocColor(soc);

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 py-2">
      <span
        className="font-mono text-3xl font-bold"
        style={{ color: fillColor }}
      >
        {soc}%
      </span>

      <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">
        State of Charge
      </span>
    </div>
  );
}

// ---------------------------------------------------------------
// METRIC CELL
// ---------------------------------------------------------------

function MetricCell({ label, value, unit = "" }) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg px-3 py-2 flex flex-col">
      <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">
        {label}
      </span>

      <span className="text-slate-100 text-sm font-mono font-semibold">
        {value}

        {unit && (
          <span className="text-slate-500 text-xs ml-0.5">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------
// CHANNEL CONTROL
// ---------------------------------------------------------------
// commandOn:
//   What the USER selected.
//
// channelLiveOn:
//   What the BMS is actually reporting.
//
// These are deliberately separate.
// ---------------------------------------------------------------

function ChannelControl({
  channelLiveOn = false,
  onSetChannel,
}) {
  // -------------------------------------------------------------
  // LOCAL GUI COMMAND STATE
  // -------------------------------------------------------------
  //
  // This state changes immediately when the user clicks ON/OFF.
  //
  const [commandOn, setCommandOn] = useState(channelLiveOn);

  // -------------------------------------------------------------
  // IMPORTANT:
  //
  // Do NOT continuously overwrite commandOn from channelLiveOn.
  //
  // Otherwise:
  //
  // User clicks ON
  //      ↓
  // commandOn becomes true
  //      ↓
  // BMS still reports OFF for a moment
  //      ↓
  // commandOn becomes false again
  //
  // That makes the button appear as if it cannot be clicked.
  //
  // Therefore we only initialize commandOn from the BMS state.
  // -------------------------------------------------------------

  useEffect(() => {
    // Only synchronize when the component is initially receiving
    // BMS information and the user has not made a command yet.
    //
    // We intentionally do not continuously overwrite the user's
    // button selection.
  }, []);

  // -------------------------------------------------------------
  // SEND CHANNEL COMMAND
  // -------------------------------------------------------------

  const handleChannelChange = (on) => {
    console.log(
      "[GUI] Channel button clicked:",
      on ? "ON" : "OFF"
    );

    // -----------------------------------------------------------
    // 1. CHANGE GUI IMMEDIATELY
    // -----------------------------------------------------------

    setCommandOn(on);

    // -----------------------------------------------------------
    // 2. SEND COMMAND TO BUN -> ESP32
    // -----------------------------------------------------------

    if (onSetChannel) {
      console.log(
        "[GUI] Sending channel command:",
        on ? "ON" : "OFF"
      );

      onSetChannel(on);
     } else {
      console.warn(
        "[GUI] onSetChannel is not connected."
      );
    }
  };

  return (
    <div
      className="relative z-[100] flex flex-col gap-2 pt-2 border-t border-slate-800/80"
      style={{
        pointerEvents: "auto",
      }}
    >

      {/* ------------------------------------------------------- */}
      {/* CHANNEL COMMAND                                         */}
      {/* ------------------------------------------------------- */}

      <div className="flex items-center justify-between">

        <span className="text-xs font-mono text-slate-500">
          Channel
        </span>

        <div
          className="relative z-[100] flex gap-1.5"
          style={{
            pointerEvents: "auto",
          }}
        >

          {/* --------------------------------------------------- */}
          {/* ON BUTTON                                           */}
          {/* --------------------------------------------------- */}

          <button
            type="button"
            onClick={() => handleChannelChange(true)}
            className={`relative z-[101] px-3 py-1 rounded text-xs font-mono font-bold border cursor-pointer select-none ${
              commandOn
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                : "bg-slate-950/50 border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-300"
            }`}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            ON
          </button>

          {/* --------------------------------------------------- */}
          {/* OFF BUTTON                                          */}
          {/* --------------------------------------------------- */}

          <button
            type="button"
            onClick={() => handleChannelChange(false)}
            className={`relative z-[101] px-3 py-1 rounded text-xs font-mono font-bold border cursor-pointer select-none ${
              !commandOn
                ? "bg-red-950/80 border-red-500 text-red-300"
                : "bg-slate-950/50 border-slate-700 text-slate-500 hover:border-red-500 hover:text-red-300"
            }`}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            OFF
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* BMS LIVE FEEDBACK                                       */}
      {/* ------------------------------------------------------- */}

      <div className="flex items-center justify-between">

        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          BMS Live Channel
        </span>

        <span
          className={`text-[10px] font-mono font-bold ${
            channelLiveOn
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {channelLiveOn ? "ON" : "OFF"}
        </span>

      </div>

    </div>
  );
}

// ---------------------------------------------------------------
// BATTERY PANEL
// ---------------------------------------------------------------

export default function BatteryPanel({
  telemetryData = {},
  onSetChannel,
}) {
  const {
    // -----------------------------------------------------------
    // BMS DATA
    // -----------------------------------------------------------

    soc = 0,

    packVoltage = 0,
    packCurrent = 0,

    maxCellVoltage = 0,
    minCellVoltage = 0,

    maxCellTemp = 0,
    minCellTemp = 0,

    bmsStatus = "OK",

    faultFlags = [],

    // -----------------------------------------------------------
    // ACTUAL BMS LIVE CHANNEL STATUS
    // -----------------------------------------------------------

    channelLiveOn = false,

  } = telemetryData;

  // -------------------------------------------------------------
  // PACK METRICS
  // -------------------------------------------------------------

  const metrics = [
    {
      label: "Pack Voltage",
      value: packVoltage,
      unit: "V",
    },

    {
      label: "Pack Current",
      value: packCurrent,
      unit: "A",
    },

    {
      label: "Max Cell Voltage",
      value: maxCellVoltage,
      unit: "V",
    },

    {
      label: "Min Cell Voltage",
      value: minCellVoltage,
      unit: "V",
    },

    {
      label: "Max Cell Temp",
      value: maxCellTemp,
      unit: "°C",
    },

    {
      label: "Min Cell Temp",
      value: minCellTemp,
      unit: "°C",
    },
  ];

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">

      {/* ------------------------------------------------------- */}
      {/* SOC                                                     */}
      {/* ------------------------------------------------------- */}

      <SocReadout soc={soc} />

      {/* ------------------------------------------------------- */}
      {/* PACK DATA                                               */}
      {/* ------------------------------------------------------- */}

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <MetricCell
            key={m.label}
            {...m}
          />
        ))}
      </div>

      {/* ------------------------------------------------------- */}
      {/* BMS STATUS                                              */}
      {/* ------------------------------------------------------- */}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">

        <span className="text-xs font-mono text-slate-500">
          BMS Status
        </span>

        <span
          className={`text-xs font-mono font-semibold ${
            bmsStatus === "OK"
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {bmsStatus}
        </span>

      </div>

      {/* ------------------------------------------------------- */}
      {/* CHANNEL CONTROL                                         */}
      {/* ------------------------------------------------------- */}

      <ChannelControl
        channelLiveOn={channelLiveOn}
        onSetChannel={onSetChannel}
      />

      {/* ------------------------------------------------------- */}
      {/* FAULT FLAGS                                             */}
      {/* ------------------------------------------------------- */}

      {faultFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">

          {faultFlags.map((flag) => (
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

