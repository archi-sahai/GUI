import { useState, useEffect } from "react";

// ---------------------------------------------------------------
// CommHeartbeatPanel
// ---------------------------------------------------------------
// A system shows FAULT if EITHER of two independent things is true:
//   1. Its heartbeat timestamp has gone stale (no update in time)
//   2. Its latency (from useSystemState's systemFaults list) is over
//      the limit
// These are two separate signals combined into one badge — a system
// could have a fine heartbeat but bad latency, or vice versa, and
// either one alone should flag it.
const HEARTBEAT_TIMEOUT_MS = 100;

export default function CommHeartbeatPanel({ links = [], systemFaults = [], onHeartbeatLoss }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // A Set of system NAMES currently reported as faulting by
  // useSystemState (latency faults, IMD, BMS, etc). We only need to
  // know "is this link's name in the fault list", not the details —
  // the details are shown elsewhere (e.g. a systemFaults list).
  const faultedSystemNames = new Set(systemFaults.map((f) => f.system));

  useEffect(() => {
    const anyHeartbeatLost = links.some(
      (link) => now - link.lastHeartbeat > HEARTBEAT_TIMEOUT_MS
    );
    if (anyHeartbeatLost && onHeartbeatLoss) {
      onHeartbeatLoss();
    }
  }, [now, links, onHeartbeatLoss]);

  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => {
        const heartbeatStale = now - link.lastHeartbeat > HEARTBEAT_TIMEOUT_MS;
        const latencyFault = faultedSystemNames.has(link.name);
        const isFault = heartbeatStale || latencyFault;

        return (
          <div key={link.name} className="flex items-center justify-between">
            <span className="text-slate-200 font-mono text-sm font-semibold">
              {link.name}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                isFault
                  ? "text-red-300 bg-red-950/60 border border-red-500/40"
                  : "text-emerald-400"
              }`}
            >
              {isFault ? "FAULT" : "OK"}
            </span>
          </div>
        );
      })}
    </div>
  );
}