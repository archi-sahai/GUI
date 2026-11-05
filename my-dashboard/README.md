# GUI

Control and monitoring GUI for the LoopMIT hyperloop pod. Built with React, Vite and Tailwind CSS.

## Features

- **HV battery:** live pack voltage, current, SOC and cell voltages, plus HV channel ON/OFF control
- **LV battery:** live data from the Daly BMS
- **System state:** state selector, E-stop, safety status and state requirements
- **Propulsion & DC-link:** live status panel
- **Communication & heartbeat:** link status and heartbeat-loss handling
- **Sensors:** OK / FAULT / NO DATA health for each sensor (a sensor is marked FAULT when it goes stale or reads out of range)
- **Diagnostics:** temperature, data integrity and IMU pages

## How it works

```
ESP32 --USB serial--> Node bridge --WebSocket (ws://localhost:4000)--> GUI
```

One ESP32 carries both BMS data streams. The bridge (`bun-bridge/bridge.mjs`) reads the serial log lines, parses them and broadcasts JSON to the GUI. Commands from the GUI, such as channel ON/OFF, go back to the ESP32 over serial.

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. In `bun-bridge/bridge.mjs`, set `SERIAL_PORT` to your ESP32's port (for example `COM3`, see Device Manager).
3. Start the bridge:
   ```
   node bun-bridge/bridge.mjs
   ```
4. In a second terminal, start the GUI:
   ```
   npm run dev
   ```
5. Open http://localhost:5173

If Vite runs on a different port, add that URL to `ALLOWED_ORIGINS` in `bridge.mjs`.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Top-level state and data wiring |
| `src/ControlCenter.jsx` | Main dashboard layout |
| `src/useBmsSocket.js` | WebSocket hook for live BMS data |
| `src/useSystemState.jsx` | System state logic |
| `src/BatteryPanel.jsx`, `src/LvBatteryPanel.jsx` | HV and LV battery panels |
| `src/SensorPanel.jsx` | Sensor health grid |
| `src/SidePages.jsx` | Temperatures, integrity and IMU pages |
| `bun-bridge/bridge.mjs` | Serial-to-WebSocket bridge |

## Data status

| Data | Status |
| --- | --- |
| HV and LV battery | Live from the ESP32 |
| Sensor panel, IMU, temperatures | Simulated until the slave data format is connected |

## Tech stack

React, Vite, Tailwind CSS, lucide-react, Node, serialport, ws
