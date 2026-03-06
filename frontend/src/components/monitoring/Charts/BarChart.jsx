import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const BarChart = ({
  data,
  dataKey,
  xAxisKey = "timestamp",
  color = "#10b981",
  unit = "",
  showAxis = true,
  showTooltip = true,
  showLegend = false,
  height = 300,
}) => {
  const formatXAxis = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatTooltip = (value) => {
    return [`${value}${unit}`, dataKey];
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showAxis && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}

        {showAxis && (
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={formatXAxis}
            stroke="#6b7280"
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
        )}

        {showAxis && (
          <YAxis
            stroke="#6b7280"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => `${value}${unit}`}
          />
        )}

        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "0.5rem",
              color: "#f3f4f6",
            }}
            formatter={formatTooltip}
            labelFormatter={(label) => new Date(label).toLocaleString()}
          />
        )}

        {showLegend && <Legend />}

        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
