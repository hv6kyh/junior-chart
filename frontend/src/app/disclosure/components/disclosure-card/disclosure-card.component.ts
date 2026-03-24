import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import type { DisclosureWithStats, PatternStats } from '../../types/disclosure.types';

@Component({
  selector: 'app-disclosure-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TypeBadgeComponent],
  templateUrl: './disclosure-card.component.html',
  styleUrls: ['./disclosure-card.component.css'],
})
export class DisclosureCardComponent {
  @Input({ required: true }) item!: DisclosureWithStats;

  get stat1m(): PatternStats | undefined {
    return this.item.stats.find((s) => s.period === '1m');
  }

  formatReturn(val: number | null): string {
    if (val === null) return '-';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  }

  formatRate(val: number | null): string {
    if (val === null) return '-';
    return `${(val * 100).toFixed(0)}%`;
  }
}
