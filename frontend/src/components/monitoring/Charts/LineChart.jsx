import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const LineChart = ({
  data,
  dataKey,
  xAxisKey = "timestamp",
  color = "#4f46e5",
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
      <RechartsLineChart
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

        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 8 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
