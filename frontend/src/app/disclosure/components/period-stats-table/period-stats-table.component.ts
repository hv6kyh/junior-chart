import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PatternStats } from '../../types/disclosure.types';

@Component({
  selector: 'app-period-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-stats-table.component.html',
  styleUrls: ['./period-stats-table.component.css'],
})
export class PeriodStatsTableComponent {
  @Input({ required: true }) stats!: PatternStats[];

  get statsByPeriod(): Record<string, PatternStats | undefined> {
    const map: Record<string, PatternStats | undefined> = {};
    for (const s of this.stats) {
      map[s.period] = s;
    }
    return map;
  }

  periods = [
    { key: '1w', label: '1주' },
    { key: '1m', label: '1개월' },
    { key: '3m', label: '3개월' },
  ];

  formatReturn(val: number | null): string {
    if (val === null) return '-';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  }

  formatRate(val: number | null): string {
    if (val === null) return '-';
    return `${(val * 100).toFixed(0)}%`;
  }

  isPositive(val: number | null): boolean {
    return val !== null && val > 0;
  }

  isNegative(val: number | null): boolean {
    return val !== null && val < 0;
  }
}
