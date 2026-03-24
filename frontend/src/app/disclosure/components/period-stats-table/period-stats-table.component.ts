import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PatternStats } from '../../types/disclosure.types';
import { formatReturn as _formatReturn, formatRate as _formatRate } from '../../utils/format';

@Component({
  selector: 'app-period-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-stats-table.component.html',
  styleUrls: ['./period-stats-table.component.css'],
})
export class PeriodStatsTableComponent {
  @Input({ required: true }) stats!: PatternStats[];

  formatReturn = _formatReturn;
  formatRate = _formatRate;

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

  isPositive(val: number | null): boolean {
    return val !== null && val > 0;
  }

  isNegative(val: number | null): boolean {
    return val !== null && val < 0;
  }
}
