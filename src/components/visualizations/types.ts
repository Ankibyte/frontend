// File: frontend/src/components/visualizations/types.ts
export type RelevanceType = 'high' | 'medium' | 'low' | 'document';

export interface DataPoint {
  cardId: string;
  relevance: RelevanceType;
  embedding: number[];
  similarity: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface ProcessedDataPoint extends DataPoint {
  x: number;
  y: number;
  z: number;
}

export interface CustomTooltipData {
  active?: boolean;
  payload?: Array<{
    payload: ProcessedDataPoint;
  }>;
}
