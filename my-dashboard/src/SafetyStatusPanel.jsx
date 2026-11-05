// ---------------------------------------------------------------
// SafetyStatusPanel — Hour 3
// ---------------------------------------------------------------
// Subtask 3.1: one row per EHW requirement.
// Subtask 3.2: color-coding, done ONCE in getRowColor and reused for
// every row, instead of writing the same red/green logic 7 times.
//
// The key pattern: build a plain array of {label, value, isOk} objects,
// then .map() over it to render rows. Adding an 8th requirement later
// means adding one array entry — not writing new markup.
 
function getRowColor(isOk) {
  return isOk
    ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/30"
    : "text-red-400 border-red-500/40 bg-red-950/30";
}
 
function Row({ label, value, isOk }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg border font-mono text-xs ${getRowColor(
        isOk
      )}`}
    >
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOk ? "bg-emerald-400" : "bg-red-500"
          }`}
        />
        {value}
      </span>
    </div>
  );
}
 
// telemetryData is the object returned by useSystemState(). This
// component doesn't know or care HOW those values were derived — it
// just decides "is this value the good one, or not" for each row.
export default function SafetyStatusPanel({ telemetryData = {} }) {
  const {
    hvalGreen,
    hvalRed,
    imdStatus,
    bmsStatus,
    ebsPosition,
   
  } = telemetryData;
 
  // Each row: label shown to the user, value shown to the user,
  // and isOk — the boolean that drives red vs green.
  const rows = [
    { label: "HVAL Green Light", value: hvalGreen ? "Lit" : "Off", isOk: hvalGreen },
    { label: "HVAL Red Light", value: hvalRed ? "Lit" : "Off", isOk: !hvalRed },
    { label: "IMD Status", value: imdStatus, isOk: imdStatus === "OK" },
    { label: "High Voltage BMS", value: bmsStatus, isOk: bmsStatus === "OK" },
    { label: "Emergency Braking System", value: ebsPosition, isOk: ebsPosition === "Retracted" },
   
  ];
 
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <Row key={row.label} {...row} />
      ))}
    </div>
  );
}