import type { EChartsOption } from 'echarts';

import type {
  BarChartProps,
  ChartTheme,
  HeatmapChartProps,
  LineChartProps,
  PieChartProps,
} from './types';

type LineChartOptionInput = LineChartProps & { theme: ChartTheme };
type BarChartOptionInput = BarChartProps & { theme: ChartTheme };
type PieChartOptionInput = PieChartProps & { theme: ChartTheme };
type HeatmapChartOptionInput = HeatmapChartProps & { theme: ChartTheme };

function animationOption(enabled = true, duration = 900, delayStep = 40) {
  return {
    animation: enabled,
    animationDuration: duration,
    animationDurationUpdate: Math.round(duration * 0.55),
    animationEasing: 'cubicOut' as const,
    animationEasingUpdate: 'cubicInOut' as const,
    animationDelay: enabled ? (index: number) => index * delayStep : 0,
    animationDelayUpdate: enabled
      ? (index: number) => index * Math.round(delayStep / 2)
      : 0,
  };
}

function tooltipOption(theme: ChartTheme) {
  return {
    backgroundColor: theme.elevatedColor,
    borderColor: theme.borderColor,
    textStyle: { color: theme.textColor },
  };
}

function legendOption(show: boolean, theme: ChartTheme) {
  return show
    ? {
        top: 0,
        textStyle: { color: theme.secondaryTextColor },
      }
    : undefined;
}

function categoryAxis(
  data: readonly string[],
  theme: ChartTheme,
  boundaryGap = true,
) {
  return {
    type: 'category' as const,
    data: [...data],
    boundaryGap,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: theme.borderColor } },
    axisLabel: { color: theme.secondaryTextColor },
  };
}

function valueAxis(
  theme: ChartTheme,
  max?: number,
  interval?: number,
  formatter?: (value: string | number) => string,
) {
  return {
    type: 'value' as const,
    max,
    interval,
    axisLabel: {
      color: theme.secondaryTextColor,
      formatter,
    },
    splitLine: {
      lineStyle: {
        color: theme.borderColor,
        type: 'dashed' as const,
      },
    },
  };
}

export function hasCartesianData(
  series: readonly { data: readonly (number | null)[] }[],
): boolean {
  return series.some((item) => item.data.some((value) => value !== null));
}

export function buildLineChartOption({
  categories,
  series,
  theme,
  animation = true,
  smooth = true,
  area = false,
  showLegend = series.length > 1,
  yAxisMax,
  yAxisInterval,
  yAxisFormatter,
}: LineChartOptionInput): EChartsOption {
  return {
    ...animationOption(animation, 900, 45),
    aria: { enabled: true },
    color: [...theme.colors],
    tooltip: {
      trigger: 'axis',
      ...tooltipOption(theme),
    },
    legend: legendOption(showLegend, theme),
    grid: {
      top: showLegend ? 36 : 12,
      right: 8,
      bottom: 4,
      left: 4,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: categoryAxis(categories, theme, false),
    yAxis: valueAxis(theme, yAxisMax, yAxisInterval, yAxisFormatter),
    series: series.map((item) => ({
      type: 'line' as const,
      name: item.name,
      data: [...item.data],
      stack: item.stack,
      smooth: item.smooth ?? smooth,
      showSymbol: false,
      symbolSize: 6,
      connectNulls: true,
      itemStyle: item.color ? { color: item.color } : undefined,
      lineStyle: {
        width: 2,
        color: item.color,
      },
      areaStyle:
        (item.area ?? area) === true
          ? { color: item.color, opacity: 0.12 }
          : undefined,
      emphasis: { focus: 'series' as const },
    })),
  };
}

export function buildBarChartOption({
  categories,
  series,
  theme,
  animation = true,
  direction = 'vertical',
  showLegend = series.length > 1,
  barMaxWidth = 28,
  yAxisMax,
  yAxisInterval,
  valueFormatter,
}: BarChartOptionInput): EChartsOption {
  const horizontal = direction === 'horizontal';
  const categoriesAxis = categoryAxis(categories, theme);
  const valuesAxis = valueAxis(theme, yAxisMax, yAxisInterval, valueFormatter);

  return {
    ...animationOption(animation, 900, 55),
    aria: { enabled: true },
    color: [...theme.colors],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...tooltipOption(theme),
    },
    legend: legendOption(showLegend, theme),
    grid: {
      top: showLegend ? 36 : 12,
      right: 8,
      bottom: 4,
      left: 4,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: horizontal ? valuesAxis : categoriesAxis,
    yAxis: horizontal ? categoriesAxis : valuesAxis,
    series: series.map((item) => ({
      type: 'bar' as const,
      name: item.name,
      data: [...item.data],
      stack: item.stack,
      barMaxWidth,
      itemStyle: {
        color: item.color,
        borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
      },
      emphasis: { focus: 'series' as const },
    })),
  };
}

export function buildPieChartOption({
  data,
  theme,
  animation = true,
  innerRadius = 0,
  outerRadius = '82%',
  centerValue,
  centerLabel,
  showLegend = false,
  showLabel = false,
}: PieChartOptionInput): EChartsOption {
  const hasCenterContent =
    centerValue !== undefined || centerLabel !== undefined;

  return {
    ...animationOption(animation, 1000, 35),
    aria: { enabled: true },
    color: [...theme.colors],
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c} ({d}%)',
      ...tooltipOption(theme),
    },
    legend: showLegend
      ? {
          bottom: 0,
          textStyle: { color: theme.secondaryTextColor },
        }
      : undefined,
    title: hasCenterContent
      ? {
          text: centerValue === undefined ? '' : String(centerValue),
          subtext: centerLabel,
          left: 'center',
          top: 'center',
          textStyle: {
            color: theme.textColor,
            fontSize: 26,
            fontWeight: 600,
          },
          subtextStyle: {
            color: theme.secondaryTextColor,
            fontSize: 12,
          },
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: [innerRadius, outerRadius],
        center: ['50%', showLegend ? '46%' : '50%'],
        avoidLabelOverlap: false,
        animationType: 'scale',
        animationTypeUpdate: 'transition',
        label: { show: showLabel },
        emphasis: { scaleSize: 6 },
        data: data.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: item.color ? { color: item.color } : undefined,
        })),
      },
    ],
  };
}

export function buildHeatmapChartOption({
  xLabels,
  yLabels,
  data,
  theme,
  animation = true,
  min = 0,
  max = Math.max(min, ...data.map((item) => item[2])),
  colors = [theme.fillColor, theme.successColor],
  showVisualMap = false,
  cellGap = 4,
}: HeatmapChartOptionInput): EChartsOption {
  return {
    ...animationOption(animation, 700, 12),
    aria: { enabled: true },
    tooltip: {
      position: 'top',
      ...tooltipOption(theme),
    },
    grid: {
      top: 8,
      right: 4,
      bottom: showVisualMap ? 40 : 4,
      left: 4,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: {
      ...categoryAxis(xLabels, theme),
      axisLine: { show: false },
    },
    yAxis: {
      ...categoryAxis(yLabels, theme),
      axisLine: { show: false },
    },
    visualMap: {
      min,
      max,
      show: showVisualMap,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: theme.secondaryTextColor },
      inRange: { color: [...colors] },
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((item) => [...item]),
        itemStyle: {
          borderColor: theme.containerColor,
          borderWidth: cellGap,
          borderRadius: 6,
        },
        emphasis: {
          itemStyle: {
            borderColor: theme.primaryColor,
            shadowBlur: 8,
            shadowColor: theme.primaryColor,
          },
        },
      },
    ],
  };
}
