import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  TooltipProps,
} from "recharts";
import { DataPoint, ProcessedDataPoint, RelevanceType } from "./types";

// Add types for recharts
type ValueType = number;
type NameType = string;

const COLORS = {
  high: "#FF4444",    // Red
  medium: "#FF8C00",  // Dark Orange
  low: "#FFD700",     // Gold/Yellow
  document: "#2196F3" // Blue
} as const;

const THRESHOLDS = {
  high: 0.8,
  medium: 0.5
} as const;

interface EmbeddingVisualizationProps {
  data: DataPoint[];
  documentEmbedding?: number[];
  config: {
    xAxis: string;
    yAxis: string;
  };
}

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  
  const point = payload[0].payload as ProcessedDataPoint;
  return (
    <div className="bg-white p-4 shadow-lg rounded-lg border">
      <h3 className="font-bold text-lg mb-2">
        {point.relevance === 'document' ? 'Source Document' : 'Card Details'}
      </h3>
      <div className="space-y-2">
        {point.relevance !== 'document' && (
          <>
            <p><span className="font-medium">ID:</span> {point.cardId}</p>
            <p><span className="font-medium">Relevance:</span> {point.relevance.toUpperCase()}</p>
          </>
        )}
        <p><span className="font-medium">Similarity:</span> {(point.x / 100).toFixed(3)}</p>
      </div>
    </div>
  );
};

export const EmbeddingVisualization: React.FC<EmbeddingVisualizationProps> = ({
  data,
  documentEmbedding = [],
  config
}) => {
  const [selectedCluster, setSelectedCluster] = useState<RelevanceType | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Process cards
    const cardData = data.map(point => ({
      ...point,
      x: point.similarity * 100,
      y: point.similarity * 100,
      z: point.similarity * 100
    }));

    // Add document point
    const documentPoint = {
      cardId: 'document',
      relevance: 'document' as RelevanceType,
      x: 100,
      y: 100,
      z: 100,
      similarity: 1,
      embedding: documentEmbedding
    };

    return [...cardData, documentPoint] as ProcessedDataPoint[];
  }, [data, documentEmbedding]);

  const renderReferenceAreas = () => (
    <>
      <ReferenceArea
        x1={THRESHOLDS.high * 100}
        x2={100}
        fill={COLORS.high}
        fillOpacity={0.1}
        label={{ value: 'High Relevance Zone', position: 'insideTop' }}
      />
      <ReferenceArea
        x1={THRESHOLDS.medium * 100}
        x2={THRESHOLDS.high * 100}
        fill={COLORS.medium}
        fillOpacity={0.1}
        label={{ value: 'Medium Relevance Zone', position: 'insideTop' }}
      />
      <ReferenceArea
        x1={0}
        x2={THRESHOLDS.medium * 100}
        fill={COLORS.low}
        fillOpacity={0.1}
        label={{ value: 'Low Relevance Zone', position: 'insideTop' }}
      />
    </>
  );

  if (!processedData.length) {
    return (
      <div className="text-center p-4 text-gray-500">
        No embedding data available
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] p-4">
      <ResponsiveContainer>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            name="Similarity"
            label={{ value: 'Similarity to Document (%)', position: 'bottom', offset: 40 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Distribution"
            label={{ value: 'Distribution', angle: -90, position: 'left', offset: 40 }}
            domain={[0, 100]}
          />
          <ZAxis
            type="number"
            dataKey="z"
            range={[50, 400]}
            name="Similarity"
          />
          {renderReferenceAreas()}
          <Tooltip<ValueType, NameType> content={CustomTooltip} />
          <Legend
            onClick={(e: any) => {
              const value = e.value.toLowerCase() as RelevanceType;
              setSelectedCluster((curr) => (curr === value ? null : value));
            }}
          />
          {/* Document point */}
          <Scatter
            name="DOCUMENT"
            data={processedData.filter(d => d.relevance === 'document')}
            fill={COLORS.document}
            opacity={selectedCluster ? (selectedCluster === 'document' ? 1 : 0.3) : 1}
          />
          {/* Card points */}
          {(['high', 'medium', 'low'] as const).map((relevance) => {
            const clusterData = processedData.filter((d) => d.relevance === relevance);
            const isSelected = selectedCluster === relevance;
            
            return (
              <Scatter
                key={relevance}
                name={relevance.toUpperCase()}
                data={clusterData}
                fill={COLORS[relevance]}
                opacity={selectedCluster ? (isSelected ? 1 : 0.3) : 1}
                onClick={() => setSelectedCluster(isSelected ? null : relevance)}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};