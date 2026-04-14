import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { DisclosureCardComponent } from '../components/disclosure-card/disclosure-card.component';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import type {
  DisclosureWithStats,
  TypeSummary,
  DisclosureType,
} from '../types/disclosure.types';
import { formatReturn as _formatReturn } from '../utils/format';

@Component({
  selector: 'app-disclosure-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DisclosureCardComponent, TypeBadgeComponent, DisclaimerComponent],
  templateUrl: './disclosure-dashboard.component.html',
  styleUrls: ['./disclosure-dashboard.component.css'],
})
export class DisclosureDashboardComponent implements OnInit {
  disclosures: DisclosureWithStats[] = [];
  typeSummaries: TypeSummary[] = [];
  loading = true;
  error: string | null = null;
  selectedType: DisclosureType | null = null;
  today = new Date().toISOString().slice(0, 10);

  constructor(private api: DisclosureApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const [todayRes, typesRes] = await Promise.all([
        firstValueFrom(this.api.getToday()),
        firstValueFrom(this.api.getTypes()),
      ]);

      this.disclosures = todayRes?.disclosures ?? [];
      this.typeSummaries = typesRes?.types ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get filteredDisclosures(): DisclosureWithStats[] {
    if (!this.selectedType) return this.disclosures;
    return this.disclosures.filter(
      (d) => d.disclosure.disclosureType === this.selectedType
    );
  }

  formatReturn = _formatReturn;

  toggleTypeFilter(type: DisclosureType): void {
    this.selectedType = this.selectedType === type ? null : type;
  }
}
