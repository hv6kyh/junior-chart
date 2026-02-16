import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, input, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickData, LineData, Time, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { PredictionResult, OHLC } from '../../types/stock.types';
import { DisclaimerComponent } from '../disclaimer/disclaimer.component';

@Component({
    selector: 'app-chart',
    standalone: true,
    imports: [CommonModule, DisclaimerComponent],
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css']
})
export class ChartComponent implements AfterViewInit, OnDestroy {
    @ViewChild('chartContainer') chartContainer!: ElementRef;

    private chart!: IChartApi;
    private candleSeries!: ISeriesApi<'Candlestick'>;
    private predictionSeries!: ISeriesApi<'Line'>;
    private matchSeries: ISeriesApi<'Line'>[] = [];

    // 95% 신뢰구간 (점선 경계)
    private line95UpperSeries!: ISeriesApi<'Line'>;
    private line95LowerSeries!: ISeriesApi<'Line'>;

    // 68% 신뢰구간 (채움 밴드: upper=색상, lower=흰색 마스크)
    private area68UpperSeries!: ISeriesApi<'Area'>;
    private area68LowerSeries!: ISeriesApi<'Area'>;

    private isInitialized = signal(false);

    private resizeObserver?: ResizeObserver;
    private platformId = inject(PLATFORM_ID);

    data = input<PredictionResult | null>(null);

    isInsufficient = computed(() => this.data()?.insufficient === true);
    noMatchMessage = computed(() => {
        const result = this.data();
        if (result?.noMatchContext) return result.noMatchContext.message;
        if (result?.insufficient) return '충분한 과거 패턴을 찾지 못했습니다';
        return '';
    });

    // 예측 방향: 상승(bullish) vs 하락(bearish)
    predictionDirection = computed<'bullish' | 'bearish' | null>(() => {
        const result = this.data();
        if (!result || result.scenario.length === 0 || !result.scenario.some(v => v !== 0)) return null;
        if (result.insufficient || result.noMatchContext) return null;
        const lastClose = result.history[result.history.length - 1]?.close ?? 0;
        const finalPrice = result.scenario[result.scenario.length - 1];
        return finalPrice >= lastClose ? 'bullish' : 'bearish';
    });

    showLegend = computed(() => this.predictionDirection() !== null);

    constructor() {
        effect(() => {
            const result = this.data();
            const initialized = this.isInitialized();
            if (result && initialized && this.candleSeries) {
                this.renderData(result);
            }
        });
    }

    ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.initChart();
            this.setupResizeObserver();
            this.isInitialized.set(true);
        }
    }

    private setupResizeObserver() {
        // ResizeObserver를 사용하여 컨테이너 크기 변경 감지
        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart && this.chartContainer) {
                const container = this.chartContainer.nativeElement;
                this.chart.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight,
                });
            }
        });

        this.resizeObserver.observe(this.chartContainer.nativeElement);
    }

    private initChart() {
        this.chart = createChart(this.chartContainer.nativeElement, {
            layout: {
                background: { type: 'solid' as any, color: 'transparent' },
                textColor: '#4E5968'
            },
            grid: { vertLines: { color: '#F2F4F6' }, horzLines: { color: '#F2F4F6' } },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350', downColor: '#26a69a', borderVisible: false,
            wickUpColor: '#ef5350', wickDownColor: '#26a69a',
        });

        // 68% 신뢰구간 — 상한 (색상 채움, 아래로 확장)
        this.area68UpperSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(49, 130, 246, 0.18)',
            bottomColor: 'rgba(49, 130, 246, 0.04)',
            lineColor: 'rgba(49, 130, 246, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 68% 신뢰구간 — 하한 (흰색 마스크, 하단 채움을 지워서 밴드 형성)
        this.area68LowerSeries = this.chart.addSeries(AreaSeries, {
            topColor: '#ffffff',
            bottomColor: '#ffffff',
            lineColor: 'rgba(49, 130, 246, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 95% 신뢰구간 — 점선 경계 (상한)
        this.line95UpperSeries = this.chart.addSeries(LineSeries, {
            color: 'rgba(49, 130, 246, 0.3)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 95% 신뢰구간 — 점선 경계 (하한)
        this.line95LowerSeries = this.chart.addSeries(LineSeries, {
            color: 'rgba(49, 130, 246, 0.3)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 평균 예측선 (굵은 실선)
        this.predictionSeries = this.chart.addSeries(LineSeries, {
            color: '#3182f6',
            lineWidth: 3,
            priceLineVisible: false,
            lastValueVisible: true,
        });
    }

    private clearProbabilityCloud() {
        this.matchSeries.forEach(series => this.chart.removeSeries(series));
        this.matchSeries = [];
    }

    // 다음 거래일 계산 (주말 건너뛰기)
    private getNextTradingDay(timestamp: number, daysToAdd: number): number {
        let currentDate = new Date(timestamp * 1000);
        let addedDays = 0;

        while (addedDays < daysToAdd) {
            currentDate.setDate(currentDate.getDate() + 1);
            const dayOfWeek = currentDate.getDay();
            // 주말이 아니면 카운트
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                addedDays++;
            }
        }

        return Math.floor(currentDate.getTime() / 1000);
    }

    private renderData(result: PredictionResult) {
        this.candleSeries.setData(result.history as any);

        // 이전 확률 구름 제거
        this.clearProbabilityCloud();

        // 예측 데이터 시각화
        const hasValidScenario = result.scenario.length > 0 && result.scenario.some(v => v !== 0);
        if (hasValidScenario) {
            const lastCandle = result.history[result.history.length - 1];
            const lastTime = lastCandle.time as number;

            // 방향 기반 색상 결정 (한국 주식 컨벤션: 상승=빨강, 하락=파랑)
            const isBullish = result.scenario[result.scenario.length - 1] >= lastCandle.close;
            const colors = isBullish
                ? {
                    bandFill: 'rgba(240, 68, 82, 0.18)',
                    bandFillBottom: 'rgba(240, 68, 82, 0.04)',
                    bandLine: 'rgba(240, 68, 82, 0.25)',
                    bound: 'rgba(240, 68, 82, 0.3)',
                    predLine: '#f04452',
                    cloud: (opacity: number) => `rgba(240, 68, 82, ${opacity * 0.3})`,
                }
                : {
                    bandFill: 'rgba(49, 130, 246, 0.18)',
                    bandFillBottom: 'rgba(49, 130, 246, 0.04)',
                    bandLine: 'rgba(49, 130, 246, 0.25)',
                    bound: 'rgba(49, 130, 246, 0.3)',
                    predLine: '#3182f6',
                    cloud: (opacity: number) => `rgba(49, 130, 246, ${opacity * 0.3})`,
                };

            // 시리즈 색상 동적 갱신
            this.area68UpperSeries.applyOptions({
                topColor: colors.bandFill,
                bottomColor: colors.bandFillBottom,
                lineColor: colors.bandLine,
            });
            this.area68LowerSeries.applyOptions({ lineColor: colors.bandLine });
            this.line95UpperSeries.applyOptions({ color: colors.bound });
            this.line95LowerSeries.applyOptions({ color: colors.bound });
            this.predictionSeries.applyOptions({ color: colors.predLine });

            // 공통 헬퍼: 시계열 데이터 생성
            const toSeriesData = (values: number[]) => [
                { time: lastTime as any, value: lastCandle.close },
                ...values.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];

            // 1. 68% 신뢰구간 밴드
            this.area68UpperSeries.setData(toSeriesData(result.confidence68Upper));
            this.area68LowerSeries.setData(toSeriesData(result.confidence68Lower));

            // 2. 95% 신뢰구간 점선 경계
            this.line95UpperSeries.setData(toSeriesData(result.confidence95Upper));
            this.line95LowerSeries.setData(toSeriesData(result.confidence95Lower));

            // 3. 확률 구름: 각 매칭 패턴을 투명도로 표시
            result.matches.forEach((match) => {
                const lineSeries = this.chart.addSeries(LineSeries, {
                    color: colors.cloud(match.opacity),
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                lineSeries.setData(toSeriesData(match.future));
                this.matchSeries.push(lineSeries);
            });

            // 4. 메인 예측 시나리오 (굵은 선)
            this.predictionSeries.setData(toSeriesData(result.scenario));
        } else {
            this.predictionSeries.setData([]);
            this.line95UpperSeries.setData([]);
            this.line95LowerSeries.setData([]);
            this.area68UpperSeries.setData([]);
            this.area68LowerSeries.setData([]);
        }

        // 최근 3개월 + 예측 영역 표시 (예측 밴드가 잘 보이도록)
        const lastTime = result.history[result.history.length - 1].time as number;
        const threeMonthsAgo = lastTime - (90 * 86400);
        const futureEnd = this.getNextTradingDay(lastTime, result.scenario.length + 5);

        this.chart.timeScale().setVisibleRange({
            from: threeMonthsAgo as any,
            to: futureEnd as any,
        });
    }

    ngOnDestroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.chart) {
            this.chart.remove();
        }
    }
}
