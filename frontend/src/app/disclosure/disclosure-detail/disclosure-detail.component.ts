import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { PeriodStatsTableComponent } from '../components/period-stats-table/period-stats-table.component';
import { ReturnDistributionComponent } from '../components/return-distribution/return-distribution.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import { DISCLOSURE_TYPE_LABELS, type Disclosure, type PatternStats } from '../types/disclosure.types';

@Component({
  selector: 'app-disclosure-detail',
  standalone: true,
  imports: [
    CommonModule,
    TypeBadgeComponent,
    PeriodStatsTableComponent,
    ReturnDistributionComponent,
    DisclaimerComponent,
  ],
  templateUrl: './disclosure-detail.component.html',
  styleUrls: ['./disclosure-detail.component.css'],
})
export class DisclosureDetailComponent implements OnInit {
  disclosure: Disclosure | null = null;
  stats: PatternStats[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: DisclosureApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadDetail(id);
  }

  async loadDetail(id: string): Promise<void> {
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.getDetail(id));
      this.disclosure = res?.disclosure ?? null;
      this.stats = res?.stats ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get stat1m(): PatternStats | undefined {
    return this.stats.find((s) => s.period === '1m');
  }

  get typeLabel(): string {
    if (!this.disclosure?.disclosureType) return '';
    return DISCLOSURE_TYPE_LABELS[this.disclosure.disclosureType] || '';
  }
}
