import { AreaSeries, createChart } from 'lightweight-charts';

export class ChartManager {
  constructor(containerId, colorUp, colorDown) {
    this.container = document.getElementById(containerId);
    this.chart = createChart(this.container, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#a0a0a0',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
      crosshair: {
        vertLine: {
          labelVisible: false,
        },
      },
    });

    this.series = this.chart.addSeries(AreaSeries, {
      lineColor: colorUp,
      topColor: colorUp.replace(')', ', 0.4)').replace('rgb', 'rgba'),
      bottomColor: colorUp.replace(')', ', 0.0)').replace('rgb', 'rgba'),
      lineWidth: 2,
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.chart.resize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  updateData(data) {
    if (!data || data.length === 0) return;

    this.series.setData(data);
    this.chart.timeScale().fitContent();
  }

  updateColors(isLuxury) {
    const color = isLuxury ? '#d4af37' : '#00f3ff'; // Gold or Cyan
    this.series.applyOptions({
      lineColor: color,
      topColor: isLuxury ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 243, 255, 0.4)',
      bottomColor: isLuxury ? 'rgba(212, 175, 55, 0.0)' : 'rgba(0, 243, 255, 0.0)',
    });

    this.chart.applyOptions({
      layout: {
        textColor: isLuxury ? '#8c8c8c' : '#a0a0a0',
      },
      grid: {
        vertLines: { color: isLuxury ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: isLuxury ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
      }
    });
  }
}
