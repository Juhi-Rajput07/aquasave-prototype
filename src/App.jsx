import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

/**
 * CONFIG
 * TICK_MS: update interval (ms)
 * LEAK_THRESHOLD: L/min above which we start counting towards a leak
 * LEAK_CONSEC_TICKS: how many consecutive high readings before flagging a leak
 */
const TICK_MS = 2000;
const LEAK_THRESHOLD = 8;      // L/min
const LEAK_CONSEC_TICKS = 3;   // e.g., 3 * 2s = 6 seconds continuous high flow
const MAX_POINTS = 30;         // show last 30 points on the chart

export default function App() {
  const [currentFlow, setCurrentFlow] = useState(0);
  const [totalLiters, setTotalLiters] = useState(0);
  const [labels, setLabels] = useState([]);
  const [series, setSeries] = useState([]);
  const [leakDetected, setLeakDetected] = useState(false);
  const [forceLeak, setForceLeak] = useState(false);
  const highCountRef = useRef(0);
  const runningRef = useRef(false);

  // Start simulation loop
  useEffect(() => {
    if (runningRef.current) return; // prevent double loops
    runningRef.current = true;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      // Generate simulated flow (L/min)
      const base = forceLeak ? 11 : 1;
      const span = forceLeak ? 3 : 12;
      const flow = Math.floor(Math.random() * span) + base; // 1–12 normal OR 11–13 in leak mode
      setCurrentFlow(flow);

      // Update chart data (last MAX_POINTS)
      setSeries((prev) => {
        const next = [...prev, flow];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
      setLabels((prev) => {
        const ts = new Date().toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const next = [...prev, ts];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });

      // Accumulate liters for this interval: (L/min) * (ms/60000)
      setTotalLiters((prev) => prev + flow * (TICK_MS / 60000));

      // Leak detection (consecutive high readings)
      if (flow > LEAK_THRESHOLD) {
        highCountRef.current += 1;
      } else {
        highCountRef.current = 0;
      }
      if (highCountRef.current >= LEAK_CONSEC_TICKS) {
        setLeakDetected(true);
      }

      setTimeout(tick, TICK_MS);
    };

    // first tick
    tick();

    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [forceLeak]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Water Usage (L/min)",
        data: series,
        borderColor: "#34d399", // teal-400
        backgroundColor: "rgba(52, 211, 153, 0.15)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { display: true },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { color: "rgba(148, 163, 184, 0.1)" } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148, 163, 184, 0.1)" },
        title: { display: true, text: "L/min" },
        suggestedMax: 14,
      },
    },
  };

  const totalLitersRounded = Math.round(totalLiters * 100) / 100;

  const acknowledgeAlert = () => {
    setLeakDetected(false);
    highCountRef.current = 0;
  };

  const resetDay = () => {
    setSeries([]);
    setLabels([]);
    setTotalLiters(0);
    setLeakDetected(false);
    highCountRef.current = 0;
  };

  const leaderboard = [
    { room: "Room A", saved: 26 },
    { room: "Room B", saved: 18 },
    { room: "Room C", saved: 12 },
  ];

  return (
    <div className="container">
      <h1>AquaSave – Smart Water Usage Monitor 💧</h1>

      <div className="card" style={{ marginTop: 8 }}>
        <span className={`badge ${leakDetected ? "badge-alert" : "badge-ok"}`}>
          {leakDetected ? "🚨 Leak Detected (High continuous flow)" : "✅ Normal Usage"}
        </span>
        <div className="btn-row">
          <button onClick={() => setForceLeak((s) => !s)}>
            {forceLeak ? "Stop Leak Simulation" : "Simulate Leak"}
          </button>
          <button className="secondary" onClick={acknowledgeAlert}>
            Acknowledge / Mute Alert
          </button>
          <button className="secondary" onClick={resetDay}>Reset Day</button>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="kpi">{currentFlow} L/min</div>
          <div className="kpi-sub">Current Flow</div>
        </div>
        <div className="card">
          <div className="kpi">{totalLitersRounded} L</div>
          <div className="kpi-sub">Total Usage Today</div>
        </div>
        <div className="card">
          <div className="kpi">{LEAK_THRESHOLD}+ L/min</div>
          <div className="kpi-sub">Leak Threshold</div>
        </div>
        <div className="card">
          <div className="kpi">{LEAK_CONSEC_TICKS * (TICK_MS / 1000)} s</div>
          <div className="kpi-sub">Leak Window (continuous)</div>
        </div>
      </div>

      <div className="card">
        <h2>Live Usage</h2>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="card">
        <h2>Leaderboard 🌱</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Liters Saved (today)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((r) => (
                <tr key={r.room}>
                  <td>{r.room}</td>
                  <td>{r.saved} L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footer">
          *Leaderboard is a demo. In production we’d compute savings vs baseline per room/hostel.
        </p>
      </div>

      <div className="footer">
        Demo controls: use “Simulate Leak” to force continuous high flow and trigger the alert.
      </div>
    </div>
  );
}

