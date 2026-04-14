import type { Routes } from '@angular/router';
import { DisclosureDashboardComponent } from './disclosure-dashboard/disclosure-dashboard.component';
import { DisclosureDetailComponent } from './disclosure-detail/disclosure-detail.component';
import { DisclosureTypeStatsComponent } from './disclosure-type-stats/disclosure-type-stats.component';

export default [
  {
    path: '',
    component: DisclosureDashboardComponent,
    data: {
      title: '공시 분석 — 주린이 차트',
      description: 'DART 공시 발생 시 과거 유사 공시 이후 주가 변동 통계를 제공합니다.',
      keywords: '공시,DART,주가분석,자사주,유상증자,전환사채',
    },
  },
  {
    path: 'type/:type',
    component: DisclosureTypeStatsComponent,
    data: {
      title: '공시 유형별 통계 — 주린이 차트',
      description: '공시 유형별 주가 변동 패턴 전체 통계를 확인하세요.',
    },
  },
  {
    path: ':id',
    component: DisclosureDetailComponent,
    data: {
      title: '공시 상세 — 주린이 차트',
      description: '특정 공시의 과거 유사 사례 주가 변동 패턴 분석',
    },
  },
] satisfies Routes;
