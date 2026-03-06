import React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#4f46e5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

const PieChart = ({
  data,
  dataKey = "value",
  nameKey = "name",
  height = 300,
}) => {
  const formatTooltip = (value, name, entry) => {
    return [`${value}%`, entry.payload[nameKey]];
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "none",
            borderRadius: "0.5rem",
            color: "#f3f4f6",
          }}
          formatter={formatTooltip}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;
