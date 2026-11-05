# GUI
Live pod control dashboard for LoopMIT: a React + Vite + Tailwind UI fed by an ESP32 through a Node serial-to-WebSocket bridge.
# LoopMIT Control Center

A React dashboard for monitoring and controlling the pod's electrical systems: system state, emergency stop, HV and LV batteries, propulsion, communication heartbeats, sensors, and full-page diagnostics.

> Items marked **TODO** are things to fill in with your own details.

## Features

**Main dashboard**
- **System status:** state buttons (IDLE, MAINTENANCE, HV ACTIVE, DEMO, EMERGENCY) with the requirements checklist for the active state
- **Emergency control:** E-stop button with measured latency
- **Safety status:** SDC, EBS, HV contactors and related checks
- **HV Battery:** live BMS data (SOC, pack voltage and current, cell voltages and temperatures, faults) with channel ON/OFF control
- **LV Battery:** SOC, voltage, current, cell temperatures and faults
- **Propulsion and DC-link:** drive current, DC-link voltage and controller status
- **Communication and heartbeat:** link status for the Electrical, Propulsion, Embedded and Mech systems, with heartbeat-loss handling
- **Sensors:** sensor readings with simulated/live toggle

**Diagnostics pages** (full-page views, each with a large **BACK TO MAIN** button; `Esc` also goes back)
- **Temperatures:** 6-sensor history graph with a warning line
- **Integrity:** automatic checks on each run (sample loss, gaps, timestamp order, temperature validity and spikes, stuck sensors, IMU validity and position jumps), with a PASS / WARN / FAIL verdict
- **IMU:** position along the track, velocity, acceleration and orientation

Pages use URL hashes (`#/temps`, `#/integrity`, `#/imu`), so the browser Back button works.

**Theme:** dark mode (default) and light mode (white background, purple boxes, black text). The toggle is in the top bar and on the diagnostics pages, and the choice is remembered.

## Project structure

```
my-dashboard/
├── src/
│   ├── App.jsx                 # state, simulation, routing, data wiring
│   ├── ControlCenter.jsx       # main dashboard layout
│   ├── SidePages.jsx           # diagnostics pages, hash router, run recorder
│   ├── ThemeToggle.jsx         # dark/light toggle
│   ├── light-theme.css         # light-mode styles
│   ├── theme.css               # global styles
│   ├── useBmsSocket.js         # WebSocket connection to the BMS bridge
│   ├── useSystemState.js       # derives system state and fault flags
│   ├── stateRequirements.js    # checklist for each state
│   └── *Panel.jsx, EStopButton.jsx   # dashboard widgets
├── package.json
└── index.html
```

**TODO:** add the `bridge/` (Node.js) and `firmware/` (ESP32) folders here if they live in this repo.

## Getting started

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open the address shown in the terminal (usually `http://localhost:5173`). **TODO:** confirm the command and port match your setup.

To build for production:

```bash
npm run build
```

## Data sources

| Data | Source |
|------|--------|
| HV BMS (SOC, voltage, current, cells, faults) | Live, through `useBmsSocket` (WebSocket to the Node.js bridge) |
| LV battery | Live from the Daly BMS through the bridge (in progress); zero until data arrives |
| Temperatures, IMU | **Simulated** in `App.jsx` (a 40 s repeating run). Replace with real feeds and set `tempsSimulated` / `imuSimulated` to `false` |
| Propulsion, DC-link, latencies | Simulated or fixed values in `App.jsx` |

Values with no data show `0` or `NO DATA`, never a made-up number.

## Configuration

Edit these constants at the top of the files:

| Setting | File | Meaning |
|---------|------|---------|
| `TEMP_WARN_C` | `SidePages.jsx` | Temperature warning level (°C) |
| `TRACK_LENGTH_M` | `SidePages.jsx` | Track length for the IMU position bar |
| `LATENCY_LIMIT_MS` | `App.jsx` | Latency above this triggers a latency fault (EMERGENCY) |

**TODO:** set the first two to your real values.

## Safety behaviour

- Any latency reading above `LATENCY_LIMIT_MS` triggers a latency fault and forces the displayed state to **EMERGENCY**.
- Choosing a state button acknowledges a latched latency fault by resetting the readings above the limit. The next E-stop press measures latency again.
- The EMERGENCY state button cannot be selected manually.
- Heartbeat loss or a slow E-stop triggers EMERGENCY.

This dashboard is a monitoring aid. It must not be the only safety system on the pod.

## Known limitations

- Temperature and IMU data are simulated.
- IMU position drifts over time. Correct it with track markers or encoders if available.
- The Sensors panel needs `sensors`, `sensorsSimulated` and `onToggleSensor` passed from `App.jsx`.

## Team

LoopMIT. **TODO:** add names, contact and licence.
