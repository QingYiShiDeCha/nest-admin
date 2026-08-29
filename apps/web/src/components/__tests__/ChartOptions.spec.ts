import { describe, expect, it } from 'vitest';

import {
  buildBarChartOption,
  buildHeatmapChartOption,
  buildLineChartOption,
  buildPieChartOption,
  hasCartesianData,
} from '@/components/core/charts/options';
import type { ChartTheme } from '@/components/core/charts/types';

const theme: ChartTheme = {
  primaryColor: '#5D87FF',
  colors: ['#5D87FF', '#13DEB9', '#FFAE1F'],
  textColor: '#323251',
  secondaryTextColor: '#7987A1',
  borderColor: '#E2E8EE',
  containerColor: '#FFFFFF',
  elevatedColor: '#FFFFFF',
  fillColor: '#F2F4F5',
  successColor: '#13DEB9',
};

describe('chart option builders', () => {
  it('为折线图统一生成主题、面积和分段动画配置', () => {
    const option = buildLineChartOption({
      categories: ['周一', '周二'],
      series: [{ name: '访问量', data: [12, 18], area: true }],
      theme,
    });

    expect(option).toMatchObject({
      animation: true,
      color: theme.colors,
      tooltip: {
        trigger: 'axis',
        borderColor: theme.borderColor,
      },
      xAxis: { type: 'category', boundaryGap: false },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.12 },
        },
      ],
    });
    expect(option.animationDelay).toBeTypeOf('function');
  });

  it('支持横向柱图且关闭动画不会留下延迟函数', () => {
    const option = buildBarChartOption({
      categories: ['研发部', '市场部'],
      series: [{ data: [20, 16] }],
      direction: 'horizontal',
      animation: false,
      theme,
    });

    expect(option).toMatchObject({
      animation: false,
      animationDelay: 0,
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: ['研发部', '市场部'] },
      series: [
        {
          type: 'bar',
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    });
  });

  it('为环形图生成中心内容和缩放入场动画', () => {
    const option = buildPieChartOption({
      data: [
        { name: '手机', value: 60 },
        { name: '桌面端', value: 40 },
      ],
      innerRadius: '60%',
      outerRadius: '84%',
      centerValue: 100,
      theme,
    });

    expect(option).toMatchObject({
      animation: true,
      title: { text: '100', left: 'center', top: 'center' },
      series: [
        {
          type: 'pie',
          radius: ['60%', '84%'],
          animationType: 'scale',
        },
      ],
    });
  });

  it('为热力图生成主题色阶、坐标轴和更新动画', () => {
    const option = buildHeatmapChartOption({
      xLabels: ['周一', '周二'],
      yLabels: ['上午'],
      data: [
        [0, 0, 20],
        [1, 0, 80],
      ],
      theme,
    });

    expect(option).toMatchObject({
      animation: true,
      xAxis: { data: ['周一', '周二'] },
      yAxis: { data: ['上午'] },
      visualMap: {
        min: 0,
        max: 80,
        show: false,
        inRange: { color: [theme.fillColor, theme.successColor] },
      },
      series: [{ type: 'heatmap' }],
    });
    expect(option.animationDelayUpdate).toBeTypeOf('function');
  });

  it('把全空的笛卡尔数据识别为空状态', () => {
    expect(hasCartesianData([{ data: [null, null] }])).toBe(false);
    expect(hasCartesianData([{ data: [null, 0] }])).toBe(true);
  });
});
