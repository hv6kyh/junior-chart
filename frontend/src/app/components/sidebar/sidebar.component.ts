import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PredictionResult, PredictionMatch } from '../../types/stock.types';
import { MiniChartComponent } from '../mini-chart/mini-chart.component';
import { UIStateService } from '../../services/ui-state.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MiniChartComponent,
    LucideAngularModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  data = input<PredictionResult | null>(null);
  hoveredMatch = signal<PredictionMatch | null>(null);
  tooltipY = signal<number>(0);

  avgSimilarity = computed(() => {
    const result = this.data();
    if (!result || result.matches.length === 0) return 0;
    const sum = result.matches.reduce((acc, m) => acc + m.correlation, 0);
    return (sum / result.matches.length) * 100;
  });

  totalMatches = computed(() => {
    const result = this.data();
    return result?.matches.length || 0;
  });

  rsiAnalysis = computed(() => {
    return this.data()?.integratedAnalysis || null;
  });

  rsiStatusDisplay = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return '분석 중...';
    if (analysis.status === '과매수') return '과매수(70↑)';
    if (analysis.status === '과매도') return '과매도(30↓)';
    return '중립';
  });

  momentumSignal = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return '대기 중';
    if (analysis.divergence_type === 'Bullish') return '상승 다이버전스 포착';
    if (analysis.divergence_type === 'Bearish') return '하락 다이버전스 포착';
    return '정상 신호';
  });

  confidenceScore = computed(() => {
    return this.data()?.integratedAnalysis?.confidence_score || 0;
  });

  confidenceLevel = computed(() => {
    const score = this.confidenceScore();
    if (score >= 80) return '매우 높음';
    if (score >= 60) return '높음';
    if (score >= 40) return '보통';
    return '낮음';
  });

  confidenceOffset = computed(() => {
    const circumference = 2 * Math.PI * 34; // ~213.6
    const score = this.confidenceScore();
    return circumference - (circumference * score) / 100;
  });

  rsiStatusClass = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return 'neutral';
    if (analysis.status === '과매수') return 'overbought';
    if (analysis.status === '과매도') return 'oversold';
    return 'neutral';
  });

  momentumChipClass = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return 'signal-neutral';
    if (analysis.divergence_type === 'Bullish') return 'signal-bullish';
    if (analysis.divergence_type === 'Bearish') return 'signal-bearish';
    return 'signal-neutral';
  });

  rsiValue = computed(() => {
    return this.rsiAnalysis()?.rsi_value || 50;
  });

  // Part A: Pattern Storytelling - Match Details
  matchDetails = computed(() => {
    const result = this.data();
    if (!result) return [];
    return result.matches.map(match => ({
      ...match,
      futureReturn: match.future.length > 1
        ? ((match.future[match.future.length - 1] - match.future[0]) / match.future[0]) * 100
        : 0,
      predictionDays: match.future.length,
    }));
  });

  // Part A: Convergence Message
  convergenceMessage = computed(() => {
    const result = this.data();
    if (!result?.convergenceLabel) return null;
    if (result.convergenceLabel === 'convergent')
      return { text: '과거 사례들이 비슷한 결과를 보여줍니다', cls: 'msg-convergent' };
    if (result.convergenceLabel === 'divergent')
      return { text: '과거 사례들의 결과가 제각각입니다 — 불확실성이 큽니다', cls: 'msg-divergent' };
    return { text: '과거 사례들의 결과가 혼재되어 있습니다', cls: 'msg-neutral' };
  });

  // Part C: No Match Message
  noMatchMessage = computed(() => {
    const result = this.data();
    if (result?.noMatchContext) return result.noMatchContext.message;
    if (result?.insufficient) return '충분한 과거 패턴을 찾지 못했습니다. 예측 신뢰도가 낮습니다.';
    return null;
  });

  // Part D: Simulation Summary
  simulationSummary = computed(() => {
    const result = this.data();
    if (!result || result.matches.length === 0) return null;
    const returns = result.matches
      .filter(m => m.simulatedReturn != null)
      .map(m => m.simulatedReturn!);
    if (returns.length === 0) return null;
    const wins = returns.filter(r => r > 0).length;
    const losses = returns.filter(r => r <= 0).length;
    const avgReturn = (returns.reduce((a, b) => a + b, 0) / returns.length) * 100;
    const maxReturn = Math.max(...returns) * 100;
    const minReturn = Math.min(...returns) * 100;
    return { wins, losses, total: returns.length, avgReturn, maxReturn, minReturn };
  });

  // Part F: Strong Signal Warning
  strongSignalWarning = computed(() => {
    const details = this.matchDetails();
    if (details.length < 2) return null;
    const allUp = details.every(m => m.futureReturn > 0);
    const allDown = details.every(m => m.futureReturn < 0);
    if (allUp) return '모든 과거 사례가 상승을 가리키지만, 과거 사례일 뿐 보장이 아닙니다.';
    if (allDown) return '모든 과거 사례가 하락을 가리키지만, 과거 사례일 뿐 보장이 아닙니다.';
    return null;
  });

  constructor(
    public uiService: UIStateService,
    private analytics: AnalyticsService,
  ) {}

  openProof(match: PredictionMatch) {
    this.uiService.openMatchDetail(match);
    this.analytics.capture('match_proof_opened', {
      correlation: match.correlation,
      date: match.date,
      rank: match.rank,
    });
  }

  onMatchHover(event: MouseEvent, match: PredictionMatch | null) {
    this.hoveredMatch.set(match);
    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const wrapperEl = (event.currentTarget as HTMLElement).closest('.sidebar-wrapper');
      const parentRect = wrapperEl?.getBoundingClientRect();
      if (parentRect) {
        const tooltipHeight = 240;
        const itemCenter = rect.top + rect.height / 2 - parentRect.top;
        let y = itemCenter - tooltipHeight / 2;
        y = Math.max(8, Math.min(y, parentRect.height - tooltipHeight - 8));
        this.tooltipY.set(y);
      }
    }
  }
}
