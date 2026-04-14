import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Bar {
  x: number;
  height: number;
  label: string;
  isPositive: boolean;
}

@Component({
  selector: 'app-return-distribution',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-distribution.component.html',
  styleUrls: ['./return-distribution.component.css'],
})
export class ReturnDistributionComponent implements OnChanges {
  @Input() avgReturn: number | null = null;
  @Input() stddev: number | null = null;
  @Input() sampleCount: number = 0;

  bars: Bar[] = [];
  svgWidth = 300;
  svgHeight = 120;
  barWidth = 24;

  ngOnChanges(): void {
    this.generateBars();
  }

  private generateBars(): void {
    if (this.avgReturn === null || this.stddev === null || this.sampleCount < 2) {
      this.bars = [];
      return;
    }

    const mean = this.avgReturn;
    const sd = Math.max(this.stddev, 1);
    const bins = 10;
    const range = 3 * sd;
    const start = mean - range;
    const binWidth = (2 * range) / bins;

    this.bars = Array.from({ length: bins }, (_, i) => {
      const binCenter = start + (i + 0.5) * binWidth;
      const z = (binCenter - mean) / sd;
      const density = Math.exp(-0.5 * z * z);
      return {
        x: i * (this.barWidth + 4),
        height: density * 80,
        label: `${binCenter >= 0 ? '+' : ''}${binCenter.toFixed(0)}%`,
        isPositive: binCenter >= 0,
      };
    });

    this.svgWidth = bins * (this.barWidth + 4);
  }
}
