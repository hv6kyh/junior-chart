import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { HeaderComponent } from '../../components/header/header.component';
import { StockSidebarComponent } from '../../components/stock-sidebar/stock-sidebar.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MatchDetailModalComponent } from '../../components/match-detail-modal/match-detail-modal.component';
import { StockService } from '../../services/stock.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WatchlistService } from '../../services/watchlist.service';
import { PredictionResult, MultiTimeframeResult } from '../../types/stock.types';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        HeaderComponent,
        StockSidebarComponent,
        ChartComponent,
        SidebarComponent,
        MatchDetailModalComponent,
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
    currentSymbol = signal('000660.KS');
    predictionData = signal<PredictionResult | null>(null);
    multiTimeframeData = signal<MultiTimeframeResult | null>(null);
    analysisMode = signal<'BASIC' | 'MULTI' | 'ADVANCED'>('BASIC');
    isLoading = signal(false);
    private stockNameMap: Record<string, { name: string; sector: string }> = {
        '000660.KS': { name: 'SK하이닉스', sector: '반도체' },
        'MSFT': { name: '마이크로소프트', sector: 'M7' },
        'CRM': { name: '세일즈포스', sector: 'SaaS' },
        'COIN': { name: '코인베이스', sector: '크립토' },
    };

    analysisModes = [
        { key: 'BASIC' as const, label: '기본 분석', desc: '최근 15일 패턴 비교' },
        { key: 'MULTI' as const, label: '다중 프레임', desc: '7/15/30일 종합 분석' },
        { key: 'ADVANCED' as const, label: '정밀 분석', desc: 'DTW + ATR 보정' },
    ];

    currentStockInfo = computed(() => {
        const symbol = this.currentSymbol();
        const hardcoded = this.stockNameMap[symbol];
        if (hardcoded) return hardcoded;

        // 사용자 워치리스트에서 검색
        const userStock = this.watchlistService.userStocks().find((s) => s.code === symbol);
        if (userStock) return { name: userStock.name, sector: userStock.sector };

        return { name: symbol, sector: '' };
    });

    currentPrice = computed(() => {
        const data = this.predictionData();
        if (!data || data.history.length === 0) return 0;
        return data.history[data.history.length - 1].close;
    });

    priceChange = computed(() => {
        const data = this.predictionData();
        if (!data || data.history.length < 2) return { value: 0, percent: 0, isUp: true };
        const last = data.history[data.history.length - 1].close;
        const prev = data.history[data.history.length - 2].close;
        const diff = last - prev;
        const percent = (diff / prev) * 100;
        return {
            value: Math.abs(diff),
            percent: Math.abs(percent),
            isUp: diff >= 0,
        };
    });

    volatilityContext = computed(() => this.predictionData()?.volatilityContext ?? null);

    volatilityLevelLabel = computed(() => {
        const ctx = this.volatilityContext();
        if (!ctx) return '';
        const labels: Record<string, string> = { low: '낮음', medium: '보통', high: '높음', very_high: '매우 높음' };
        return labels[ctx.level] || '';
    });

    // Part D-1: Grade Description and Tooltip
    gradeDescription = computed(() => {
        const grade = this.multiTimeframeData()?.confidence;
        if (!grade) return { short: '', tooltip: '' };

        const descriptions: Record<string, { short: string; tooltip: string }> = {
            A: {
                short: '3/3 기간 일치',
                tooltip: '3개 기간(7/15/30일) 모두에서 유사 패턴 발견'
            },
            B: {
                short: '2/3 기간 일치',
                tooltip: '2개 기간에서 유사 패턴 발견'
            },
            C: {
                short: '1개 이하 일치',
                tooltip: '1개 이하 기간에서만 유사 패턴 발견'
            }
        };

        return descriptions[grade] || { short: '', tooltip: '' };
    });

    private watchlistService = inject(WatchlistService);

    constructor(
        private stockService: StockService,
        public authService: AuthService,
        private analytics: AnalyticsService,
    ) {}

    ngOnInit() {
        this.loadData();
    }

    async selectSymbol(symbol: string) {
        this.currentSymbol.set(symbol);
        this.analytics.capture('stock_selected', { symbol });
        this.loadData();
    }

    setAnalysisMode(mode: 'BASIC' | 'MULTI' | 'ADVANCED') {
        this.analysisMode.set(mode);
        this.analytics.capture('analysis_mode_changed', { mode, symbol: this.currentSymbol() });
        this.loadData();
    }

    private loadData() {
        this.isLoading.set(true);
        const symbol = this.currentSymbol();
        const mode = this.analysisMode();

        if (mode === 'BASIC') {
            this.stockService.getAnalysis(symbol).subscribe({
                next: (result) => {
                    this.predictionData.set(result);
                    this.multiTimeframeData.set(null);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.matches.length });
                },
                error: (error) => {
                    console.error('Error loading data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        } else if (mode === 'MULTI') {
            this.stockService.getMultiTimeframe(symbol).subscribe({
                next: (result) => {
                    this.multiTimeframeData.set(result);
                    this.predictionData.set(result.combined);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.combined.matches.length });
                },
                error: (error) => {
                    console.error('Error loading multi-timeframe data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        } else if (mode === 'ADVANCED') {
            this.stockService.getAdvancedAnalysis(symbol, { useDTW: true, useATR: true }).subscribe({
                next: (result) => {
                    this.predictionData.set(result);
                    this.multiTimeframeData.set(null);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.matches.length });
                },
                error: (error) => {
                    console.error('Error loading advanced data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        }
    }

}
