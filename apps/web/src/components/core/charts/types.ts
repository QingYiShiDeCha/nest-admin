export type ChartAxisFormatter = (value: string | number) => string;

export interface ChartTheme {
  primaryColor: string;
  colors: readonly string[];
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  containerColor: string;
  elevatedColor: string;
  fillColor: string;
  successColor: string;
}

export interface ChartCommonProps {
  animation?: boolean;
  loading?: boolean;
  height?: number | string;
  emptyText?: string;
  ariaLabel?: string;
}

export interface CartesianChartSeries {
  name?: string;
  data: readonly (number | null)[];
  color?: string;
  stack?: string;
}

export interface LineChartSeries extends CartesianChartSeries {
  smooth?: boolean;
  area?: boolean;
}

export type BarChartSeries = CartesianChartSeries;

export interface LineChartProps extends ChartCommonProps {
  categories: readonly string[];
  series: readonly LineChartSeries[];
  smooth?: boolean;
  area?: boolean;
  showLegend?: boolean;
  yAxisMax?: number;
  yAxisInterval?: number;
  yAxisFormatter?: ChartAxisFormatter;
}

export interface BarChartProps extends ChartCommonProps {
  categories: readonly string[];
  series: readonly BarChartSeries[];
  direction?: 'vertical' | 'horizontal';
  showLegend?: boolean;
  barMaxWidth?: number;
  yAxisMax?: number;
  yAxisInterval?: number;
  valueFormatter?: ChartAxisFormatter;
}

export interface PieChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps extends ChartCommonProps {
  data: readonly PieChartDatum[];
  innerRadius?: string | number;
  outerRadius?: string | number;
  centerValue?: string | number;
  centerLabel?: string;
  showLegend?: boolean;
  showLabel?: boolean;
}

export type HeatmapChartDatum = readonly [number, number, number];

export interface HeatmapChartProps extends ChartCommonProps {
  xLabels: readonly string[];
  yLabels: readonly string[];
  data: readonly HeatmapChartDatum[];
  min?: number;
  max?: number;
  colors?: readonly string[];
  showVisualMap?: boolean;
  cellGap?: number;
}
