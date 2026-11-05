import { useEffect, useRef, useState, useCallback } from "react";

export function useBmsSocket(url = "ws://localhost:4000") {
  const [bmsData, setBmsData] = useState({});

  const [communication, setCommunication] = useState({
    telemetryToMaster: false,
    masterToPilot: false,
  });

  const [brakeApplied, setBrakeApplied] = useState(false);

  const wsRef = useRef(null);
  const communicationTimerRef = useRef(null);

  useEffect(() => {
    let ws;
    let retry;
    let closed = false;

    const resetCommunicationTimeout = () => {
      clearTimeout(communicationTimerRef.current);

      communicationTimerRef.current = setTimeout(() => {
        setCommunication({
          telemetryToMaster: false,
          masterToPilot: false,
        });
      }, 3000);
    };

    const connect = () => {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        resetCommunicationTimeout();
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          // --------------------------------------------------
          // NORMAL BMS DATA
          // --------------------------------------------------

          setBmsData((prev) => ({
            ...prev,
            ...data,
          }));

          // --------------------------------------------------
          // COMMUNICATION STATUS
          // --------------------------------------------------

          if (data.type === "communication_status") {
            setCommunication({
              telemetryToMaster:
                data.telemetryToMaster === true,

              masterToPilot:
                data.masterToPilot === true,
            });

            resetCommunicationTimeout();
          }

          // --------------------------------------------------
          // BRAKE ACKNOWLEDGEMENT
          // --------------------------------------------------

          if (
            data.type === "brake_ack" &&
            data.status === "applied"
          ) {
            console.log("Master confirmed brake applied");

            setBrakeApplied(true);
          }

        } catch {
          // Ignore invalid JSON frames
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");

        setCommunication({
          telemetryToMaster: false,
          masterToPilot: false,
        });

        if (!closed) {
          retry = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        setCommunication({
          telemetryToMaster: false,
          masterToPilot: false,
        });
      };
    };

    connect();

    return () => {
      closed = true;

      clearTimeout(retry);
      clearTimeout(communicationTimerRef.current);

      if (ws) {
        ws.close();
      }
    };
  }, [url]);

  // -------------------------------------------------------------
  // CHANNEL COMMAND
  // -------------------------------------------------------------

  const sendChannelCommand = useCallback((on) => {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          cmd: "channel",
          value: on ? "on" : "off",
        })
      );
    } else {
      console.warn("Bridge not connected, command not sent");
    }
  }, []);

  // -------------------------------------------------------------
  // EMERGENCY / BRAKING COMMAND
  // -------------------------------------------------------------

  const sendEmergencyCommand = useCallback(() => {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      setBrakeApplied(false);

      ws.send(
        JSON.stringify({
          cmd: "emergency",
          action: "brake",
        })
      );

      console.log("Emergency/braking command sent");
    } else {
      console.warn(
        "Bridge not connected, emergency command not sent"
      );
    }
  }, []);

  return {
    bmsData,
    communication,
    brakeApplied,

    sendChannelCommand,
    sendEmergencyCommand,
  };
}