import React from "react";
import { getThresholdColor } from "../../../utils/chartHelpers";

const GaugeChart = ({
  value,
  max = 100,
  thresholds = {},
  unit = "%",
  size = "md",
}) => {
  const percentage = (value / max) * 100;
  const color = getThresholdColor(percentage, thresholds);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  };

  const textSizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  // Calculate the stroke dashoffset for the gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} mx-auto`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="20"
          className="dark:stroke-gray-700"
        />

        {/* Foreground circle (progress) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>

      {/* Value text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${textSizes[size]} font-bold`} style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
    </div>
  );
};

export default GaugeChart;
