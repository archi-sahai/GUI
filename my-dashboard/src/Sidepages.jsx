import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Thermometer, ShieldCheck, Navigation } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
// ---------------------------------------------------------------
// Full-page diagnostics: Temps / Integrity / IMU
//
//   useHashPage()      -> [page, setPage]   ("main" | "temps" | "integrity" | "imu")
//   useSideRecorder()  -> history, report, running, analyzeNow, clear
//   <DiagnosticsPage page=... data=... recorder=... onNavigate=... />
//
// The recorder hook must live in App (always mounted) so history and
// run recording keep going while you are on another page.
//
// data = { temps: number[6] | null, imu: {...} | null,
//          tempsSimulated: bool, imuSimulated: bool }
// ---------------------------------------------------------------

export const PAGES = ["temps", "integrity", "imu"];

const TEMP_COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c"];
const HISTORY = 120;
const TEMP_WARN_C = 60; // TODO: set to your BMS protection temperature
const TRACK_LENGTH_M = 1000; // TODO: set to your track length

const num = (v) => typeof v === "number" && Number.isFinite(v);

// ---------------- tiny hash router (no dependency) ----------------
export function useHashPage() {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, "");
    return PAGES.includes(h) ? h : "main";
  };
  const [page, setPageState] = useState(read);

  useEffect(() => {
    const onHash = () => setPageState(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setPage = (p) => {
    window.location.hash = p === "main" ? "/" : `/${p}`;
  };
  return [page, setPage];
}

// ---------------- recorder (history + run integrity) ----------------
export function analyze(samples, periodMs) {
  const n = samples.length;
  if (n < 3) return { verdict: "NO RUN", checks: [], n, durMs: 0 };

  const durMs = samples[n - 1].t - samples[0].t;
  const expected = Math.round(durMs / periodMs) + 1;
  const lossPct = Math.max(0, (1 - n / expected) * 100);

  let maxGap = 0,
    nonMono = 0;
  for (let i = 1; i < n; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt <= 0) nonMono++;
    maxGap = Math.max(maxGap, dt);
  }

  let badTemp = 0,
    spikes = 0;
  const flat = [];
  for (let s = 0; s < 6; s++) {
    const col = samples.map((r) => r.temps?.[s]);
    badTemp += col.filter((v) => !num(v) || v < -20 || v > 120).length;
    for (let i = 1; i < col.length; i++)
      if (num(col[i]) && num(col[i - 1]) && Math.abs(col[i] - col[i - 1]) > 5) spikes++;
    const vals = col.filter(num);
    if (vals.length >= 10 && Math.max(...vals) - Math.min(...vals) < 0.05) flat.push(s + 1);
  }

  let badImu = 0,
    jumps = 0;
  for (let i = 0; i < n; i++) {
    const m = samples[i].imu;
    if (!m || ![m.ax, m.ay, m.az, m.velocity, m.position].every(num)) badImu++;
    if (i > 0 && m && samples[i - 1].imu && num(m.position) && num(samples[i - 1].imu.position)) {
      const dt = (samples[i].t - samples[i - 1].t) / 1000;
      const maxMove = (Math.abs(m.velocity) + 5) * dt * 1.5 + 0.5;
      if (Math.abs(m.position - samples[i - 1].imu.position) > maxMove) jumps++;
    }
  }

  const checks = [
    {
      name: "Sample loss",
      value: `${lossPct.toFixed(1)}% (${n}/${expected})`,
      level: lossPct > 10 ? "FAIL" : lossPct > 2 ? "WARN" : "PASS",
    },
    {
      name: "Largest gap",
      value: `${(maxGap / 1000).toFixed(2)} s`,
      level: maxGap > periodMs * 5 ? "FAIL" : maxGap > periodMs * 2.5 ? "WARN" : "PASS",
    },
    {
      name: "Timestamps in order",
      value: nonMono ? `${nonMono} out of order` : "OK",
      level: nonMono ? "FAIL" : "PASS",
    },
    {
      name: "Temp values valid",
      value: badTemp ? `${badTemp} missing/out of range` : "OK",
      level: badTemp ? "FAIL" : "PASS",
    },
    {
      name: "Temp spikes (>5 °C/sample)",
      value: spikes ? `${spikes}` : "none",
      level: spikes ? "WARN" : "PASS",
    },
    {
      name: "Stuck temp sensors",
      value: flat.length ? `sensor ${flat.join(", ")}` : "none",
      level: flat.length ? "WARN" : "PASS",
    },
    {
      name: "IMU values valid",
      value: badImu ? `${badImu} bad samples` : "OK",
      level: badImu ? "FAIL" : "PASS",
    },
    {
      name: "IMU position jumps",
      value: jumps ? `${jumps}` : "none",
      level: jumps ? "WARN" : "PASS",
    },
  ];
  const verdict = checks.some((c) => c.level === "FAIL")
    ? "FAIL"
    : checks.some((c) => c.level === "WARN")
    ? "WARN"
    : "PASS";
  return { verdict, checks, n, durMs };
}

export function useSideRecorder(data, samplePeriodMs = 1000) {
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const runSamples = useRef([]);
  const runningRef = useRef(false);
  const stillSince = useRef(null);

  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    const temps = Array.isArray(data.temps) ? data.temps : null;
    if (temps) setHistory((h) => [...h, temps].slice(-HISTORY));

    const sample = { t: now, temps, imu: data.imu ?? null };
    const v = data.imu?.velocity;

    if (num(v) && Math.abs(v) > 0.5) {
      if (!runningRef.current) {
        runningRef.current = true;
        runSamples.current = [];
        setRunning(true);
      }
      stillSince.current = null;
    }
    if (runningRef.current) {
      runSamples.current.push(sample);
      if (num(v) && Math.abs(v) < 0.1) {
        if (stillSince.current === null) stillSince.current = now;
        if (now - stillSince.current > 3000) {
          runningRef.current = false;
          stillSince.current = null;
          setRunning(false);
          setReport(analyze(runSamples.current, samplePeriodMs));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const analyzeNow = () => setReport(analyze(runSamples.current, samplePeriodMs));
  const clear = () => {
    runSamples.current = [];
    setReport(null);
  };

  return { history, report, running, analyzeNow, clear };
}

// ---------------- shared bits ----------------
const LVL = {
  PASS: "text-emerald-400",
  WARN: "text-amber-400",
  FAIL: "text-red-400",
  "NO RUN": "text-slate-500",
};

function SimBadge({ simulated }) {
  return (
    <span
      className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
        simulated
          ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
          : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
      }`}
    >
      {simulated ? "SIMULATED" : "LIVE"}
    </span>
  );
}

function NoData() {
  return <div className="text-sm font-mono text-slate-300">NO DATA</div>;
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${className}`}>
      {title && (
        <h3 className="font-mono text-sm tracking-wider text-slate-200 uppercase mb-4 font-bold">{title}</h3>
      )}
      {children}
    </div>
  );
}

const TAB_META = {
  temps: { label: "Temperatures", Icon: Thermometer },
  integrity: { label: "Integrity", Icon: ShieldCheck },
  imu: { label: "IMU", Icon: Navigation },
};

function PageShell({ page, onNavigate, children }) {
  // Esc = back to main
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onNavigate("main");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNavigate]);

  const { label } = TAB_META[page];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4">
      {/* Sticky header: always visible, even when scrolling long pages */}
      <div className="sticky top-0 z-50 flex flex-col items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-5 mb-5 shadow-lg shadow-black/40">
        {/* Centered, full-width-ish Back button: impossible to miss */}
        <button
          onClick={() => onNavigate("main")}
          className="w-full max-w-3xl flex items-center justify-center gap-4 px-8 py-7 rounded-2xl bg-cyan-400 text-slate-950 text-3xl font-mono font-bold tracking-wide hover:bg-cyan-300 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(34,211,238,0.55)]"
        >
          <ArrowLeft className="w-9 h-9" />
          BACK TO MAIN
        </button>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-mono text-2xl tracking-widest text-white uppercase mr-4">{label}</h1>
          {PAGES.map((id) => {
            const { label: l, Icon } = TAB_META[id];
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-3 px-7 py-4 rounded-xl border-2 text-lg font-mono ${
                  id === page
                    ? "bg-slate-800 border-cyan-400 text-cyan-200"
                    : "bg-slate-950/50 border-slate-600 text-slate-100 hover:text-white hover:border-slate-400"
                }`}
              >
                <Icon className="w-6 h-6" />
                {l}
              </button>
            );
          })}
          <ThemeToggle />
        </div>
      </div>

      {children}
    </div>
  );
}

// ---------------- Temps page ----------------
function TempsPage({ data, recorder }) {
  const { history } = recorder;
  const latest = history[history.length - 1];

  const W = 900,
    H = 340,
    PAD_L = 40,
    PAD_B = 8;
  const all = history.flat().filter(num);
  const lo = all.length ? Math.min(...all) - 2 : 0;
  const hi = all.length ? Math.max(...all, TEMP_WARN_C) + 2 : 100;
  const x = (i, n) => PAD_L + (W - PAD_L) - (n - 1 - i) * ((W - PAD_L) / (HISTORY - 1));
  const y = (v) => H - PAD_B - ((v - lo) / (hi - lo || 1)) * (H - PAD_B - 8);
  const ticks = 5;

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card title="Temperature history" className="col-span-12 lg:col-span-8">
        <div className="text-[11px] font-mono text-slate-500 mb-2">
          6 sensors, last {HISTORY} samples <SimBadge simulated={!!data?.tempsSimulated} />
        </div>
        {history.length < 2 ? (
          <NoData />
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full bg-slate-950/60 rounded border border-slate-800"
          >
            {Array.from({ length: ticks }, (_, i) => {
              const v = lo + ((hi - lo) * i) / (ticks - 1);
              return (
                <g key={i}>
                  <line
                    x1={PAD_L}
                    x2={W}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text x={4} y={y(v) + 4} fill="#64748b" fontSize="11" fontFamily="monospace">
                    {v.toFixed(0)}°
                  </text>
                </g>
              );
            })}
            <line
              x1={PAD_L}
              x2={W}
              y1={y(TEMP_WARN_C)}
              y2={y(TEMP_WARN_C)}
              stroke="#ef4444"
              strokeDasharray="5 4"
              strokeWidth="1.2"
            />
            {TEMP_COLORS.map((c, s) => {
              const pts = history
                .map((row, i) =>
                  num(row[s]) ? `${x(i, history.length)},${y(row[s])}` : null
                )
                .filter(Boolean)
                .join(" ");
              return <polyline key={s} points={pts} fill="none" stroke={c} strokeWidth="2" />;
            })}
          </svg>
        )}
        <div className="text-[11px] font-mono text-slate-600 mt-2">
          Red dashed line = {TEMP_WARN_C} °C warning level (edit TEMP_WARN_C in SidePages.jsx).
        </div>
      </Card>

      <Card title="Latest readings" className="col-span-12 lg:col-span-4">
        <div className="grid grid-cols-2 gap-3">
          {TEMP_COLORS.map((c, s) => {
            const v = latest?.[s];
            const hot = num(v) && v >= TEMP_WARN_C;
            return (
              <div
                key={s}
                className="bg-slate-950/50 border border-slate-800/60 rounded-lg px-3 py-3"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  Sensor {s + 1}
                </div>
                <div
                  className={`text-xl font-mono font-semibold ${
                    hot ? "text-red-400" : "text-slate-100"
                  }`}
                >
                  {num(v) ? v.toFixed(1) : "--"}
                  <span className="text-slate-500 text-sm ml-1">°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ---------------- Integrity page ----------------
function IntegrityPage({ recorder }) {
  const { report, running, analyzeNow, clear } = recorder;
  const verdict = report?.verdict ?? "NO RUN";

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-4">
        <div className="text-[11px] font-mono text-slate-500 mb-2">
          {running ? "Run in progress, recording..." : "Analysis runs when the pod stops after moving"}
        </div>
        <div className={`text-5xl font-mono font-bold ${LVL[verdict]}`}>{verdict}</div>
        {report?.checks?.length > 0 && (
          <div className="text-[11px] font-mono text-slate-600 mt-2">
            {report.n} samples over {(report.durMs / 1000).toFixed(1)} s
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={analyzeNow}
            className="flex-1 px-5 py-4 rounded-xl border border-slate-600 bg-slate-950/50 text-base font-mono text-slate-200 hover:border-cyan-500"
          >
            Analyze now
          </button>
          <button
            onClick={clear}
            className="px-5 py-4 rounded-xl border border-slate-600 bg-slate-950/50 text-base font-mono text-slate-400 hover:border-slate-400"
          >
            Clear
          </button>
        </div>
      </Card>

      <Card title="Checks" className="col-span-12 lg:col-span-8">
        {report?.checks?.length ? (
          <div className="flex flex-col gap-2">
            {report.checks.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between bg-slate-950/50 border border-slate-800/60 rounded px-4 py-2.5"
              >
                <span className="text-xs font-mono text-slate-400">{c.name}</span>
                <span className="flex items-center gap-3">
                  <span className={`text-xs font-mono ${LVL[c.level]}`}>{c.value}</span>
                  <span className={`text-[10px] font-mono font-bold w-10 text-right ${LVL[c.level]}`}>
                    {c.level}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <NoData />
        )}
      </Card>
    </div>
  );
}

// ---------------- IMU page ----------------
function Cell({ label, value, unit }) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg px-4 py-3">
      <div className="text-[11px] font-mono text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-mono font-semibold text-slate-100">
        {num(value) ? value.toFixed(2) : "--"}
        {unit && <span className="text-slate-500 text-sm ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function ImuPage({ data }) {
  const imu = data?.imu;
  const pct = num(imu?.position)
    ? Math.min(100, Math.max(0, (imu.position / TRACK_LENGTH_M) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card title="Track position">
        <div className="text-[11px] font-mono text-slate-500 mb-3">
          IMU estimate <SimBadge simulated={!!data?.imuSimulated} />
        </div>
        {!imu ? (
          <NoData />
        ) : (
          <>
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
              <span>0 m</span>
              <span>{TRACK_LENGTH_M} m</span>
            </div>
            <div className="relative h-5 bg-slate-950 border border-slate-800 rounded">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-500/30 rounded"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute w-2 bg-cyan-400 rounded"
                style={{ top: -4, height: 28, left: `calc(${pct}% - 4px)` }}
              />
            </div>
          </>
        )}
      </Card>

      <Card title="Motion">
        {!imu ? (
          <NoData />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Cell label="Position" value={imu.position} unit="m" />
            <Cell label="Velocity" value={imu.velocity} unit="m/s" />
            <Cell label="Accel X" value={imu.ax} unit="m/s²" />
            <Cell label="Accel Y" value={imu.ay} unit="m/s²" />
            <Cell label="Accel Z" value={imu.az} unit="m/s²" />
            <Cell label="Roll" value={imu.roll} unit="°" />
            <Cell label="Pitch" value={imu.pitch} unit="°" />
            <Cell label="Yaw" value={imu.yaw} unit="°" />
          </div>
        )}
        <div className="text-[11px] font-mono text-slate-600 mt-3">
          Position from an IMU alone drifts over time. Correct it with track markers or
          wheel/optical encoders if available.
        </div>
      </Card>
    </div>
  );
}

// ---------------- entry point ----------------
export default function DiagnosticsPage({ page, data, recorder, onNavigate }) {
  return (
    <PageShell page={page} onNavigate={onNavigate}>
      {page === "temps" && <TempsPage data={data} recorder={recorder} />}
      {page === "integrity" && <IntegrityPage recorder={recorder} />}
      {page === "imu" && <ImuPage data={data} />}
    </PageShell>
  );
}