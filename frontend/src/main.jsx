import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Import Chart.js for monitoring dashboard
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
);

// Create root
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
