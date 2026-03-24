import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { PeriodStatsTableComponent } from '../components/period-stats-table/period-stats-table.component';
import { ReturnDistributionComponent } from '../components/return-distribution/return-distribution.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import {
  DISCLOSURE_TYPE_LABELS,
  type DisclosureType,
  type PatternStats,
} from '../types/disclosure.types';

@Component({
  selector: 'app-disclosure-type-stats',
  standalone: true,
  imports: [
    CommonModule,
    TypeBadgeComponent,
    PeriodStatsTableComponent,
    ReturnDistributionComponent,
    DisclaimerComponent,
  ],
  templateUrl: './disclosure-type-stats.component.html',
  styleUrls: ['./disclosure-type-stats.component.css'],
})
export class DisclosureTypeStatsComponent implements OnInit {
  type: DisclosureType | null = null;
  typeLabel = '';
  stats: PatternStats[] = [];
  selectedPeriod: '1w' | '1m' | '3m' = '1m';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: DisclosureApiService,
  ) {}

  ngOnInit(): void {
    const type = this.route.snapshot.paramMap.get('type') as DisclosureType;
    if (type) {
      this.type = type;
      this.typeLabel = DISCLOSURE_TYPE_LABELS[type] || type;
      this.loadStats(type);
    }
  }

  async loadStats(type: DisclosureType): Promise<void> {
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.getStatsByType(type));
      this.stats = res?.stats ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get currentStat(): PatternStats | undefined {
    return this.stats.find((s) => s.period === this.selectedPeriod);
  }

  periods: Array<{ key: '1w' | '1m' | '3m'; label: string }> = [
    { key: '1w', label: '1주' },
    { key: '1m', label: '1개월' },
    { key: '3m', label: '3개월' },
  ];
}
