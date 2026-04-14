import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import type { DisclosureWithStats, PatternStats } from '../../types/disclosure.types';
import { formatReturn as _formatReturn, formatRate as _formatRate } from '../../utils/format';

@Component({
  selector: 'app-disclosure-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TypeBadgeComponent],
  templateUrl: './disclosure-card.component.html',
  styleUrls: ['./disclosure-card.component.css'],
})
export class DisclosureCardComponent {
  @Input({ required: true }) item!: DisclosureWithStats;

  formatReturn = _formatReturn;
  formatRate = _formatRate;

  get stat1m(): PatternStats | undefined {
    return this.item.stats.find((s) => s.period === '1m');
  }
}
