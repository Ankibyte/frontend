// File: frontend/src/components/visualizations/RelevanceDistribution.tsx
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const COLORS = {
  high: "#2196F3",
  medium: "#FFC107",
  low: "#F44336",
} as const;

interface RelevanceData {
  tag: string;
  count: number;
  percentage: number;
}

export const RelevanceDistribution: React.FC<{ data: RelevanceData[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">No data available</div>
    );
  }

  return (
    <div className="w-full h-[400px] p-4">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis
            dataKey="tag"
            tickFormatter={(value) =>
              value.charAt(0).toUpperCase() + value.slice(1)
            }
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            label={{
              value: "Number of Cards",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <YAxis
            yAxisId="percentage"
            orientation="right"
            label={{ value: "Percentage", angle: 90, position: "insideRight" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              return (
                <div className="bg-white p-3 shadow-lg rounded-lg border">
                  <p className="font-bold">
                    {payload[0].payload.tag.toUpperCase()}
                  </p>
                  <p>Cards: {payload[0].payload.count}</p>
                  <p>Percentage: {payload[0].payload.percentage}%</p>
                </div>
              );
            }}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#2196F3"
            name="Number of Cards"
            yAxisId="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.tag as keyof typeof COLORS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
