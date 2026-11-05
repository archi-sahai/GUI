import { useState, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------
// EStopButton — Hour 4
// ---------------------------------------------------------------
// Subtask 4.1: prominent circular red button, alert icon.
// Subtask 4.2: pressing "E" on the keyboard does the same thing as
//              clicking the button.
// Subtask 4.3: measure and display how long it took for the emergency
//              state to actually take effect.
//
// IMPORTANT DESIGN NOTE: this component does NOT decide what "emergency
// state" means — that's still useSystemState's job. This component's
// only responsibilities are: (1) let the user trigger it, two ways,
// and (2) measure how fast the trigger actually propagated.
//
// props:
//   onTrigger      - function called when E-Stop fires (you'll wire this
//                    to set emergencyStop: true in App.jsx's rawTelemetry)
//   currentState   - the ALREADY-DERIVED state string (e.g. "EMERGENCY"),
//                    passed down from App.jsx via useSystemState. Used
//                    here only to detect "ok, the state actually flipped."
export default function EStopButton({ onTrigger, currentState, onLatencyMeasured, displayLatencyMs = null }) {
  // No more local latencyMs state — the displayed value now always
  // comes from the parent (telemetryData.estopLatencyMs), whether it
  // arrived from a real measured click OR a hardcoded test value.
  // This makes it the single source of truth instead of two separate
  // numbers that can drift out of sync with each other.
  const pressTimeRef = useRef(null);

  const handleTrigger = () => {
    // performance.now() is higher-resolution than Date.now() and is
    // meant exactly for measuring short durations like this.
    pressTimeRef.current = performance.now();
    onTrigger();
  };

  // Subtask 4.2: keyboard listener for "E".
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key.toLowerCase() === "e") {
        handleTrigger();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    // Cleanup: remove the listener if this component ever unmounts,
    // same reasoning as clearInterval in the clock earlier.
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Subtask 4.3: whenever currentState changes to EMERGENCY, and we
  // have a pending press timestamp, compute the elapsed time. This
  // fires AFTER React has re-rendered with the new state — so the
  // measurement includes the full round trip: click -> onTrigger ->
  // App.jsx state update -> useSystemState recompute -> re-render here.
  useEffect(() => {
    if (currentState === "EMERGENCY" && pressTimeRef.current !== null) {
      const elapsed = performance.now() - pressTimeRef.current;
      pressTimeRef.current = null; // reset so it only measures once per press

      // Report the measurement upward. The PARENT stores it in
      // rawTelemetry.estopLatencyMs — the same field a hardcoded test
      // value would also go into, so both paths update the SAME
      // number, which then flows back down as displayLatencyMs.
      if (onLatencyMeasured) {
        onLatencyMeasured(elapsed);
      }
    }
  }, [currentState]);

  const latencyMs = displayLatencyMs;

  const isWithinSpec = latencyMs !== null && latencyMs < 200;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Subtask 4.1: circular red button with alert icon */}
      <button
        onClick={handleTrigger}
        aria-label="Emergency Stop"
        className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700
                   border-4 border-red-300/40 shadow-[0_0_25px_rgba(239,68,68,0.5)]
                   flex flex-col items-center justify-center gap-1
                   transition-colors duration-150 focus:outline-none
                   focus:ring-4 focus:ring-red-400/50"
      >
        <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.5} />
        <span className="text-white text-[11px] font-bold tracking-wide leading-tight">
          E-STOP
        </span>
      </button>

      <span className="text-slate-500 text-[11px] font-mono">
        Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">E</kbd> or click
      </span>

      {/* Live latency ticker */}
      <div className="font-mono text-xs flex items-center gap-2">
        <span className="text-slate-500">Response:</span>
        <span
          className={
            latencyMs === null
              ? "text-slate-600"
              : isWithinSpec
              ? "text-emerald-400"
              : "text-red-400"
          }
        >
          {latencyMs === null ? "--" : `${latencyMs.toFixed(0)} ms`}
        </span>
        <span className="text-slate-600">(req &lt;200 ms)</span>
      </div>
    </div>
  );
}