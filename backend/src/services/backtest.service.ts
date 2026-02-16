import { EngineService } from './engine.service.js';
import {
    OHLC,
    BacktestConfig,
    BacktestPointMetrics,
    BacktestAggregateMetrics,
    BacktestResult,
    AdvancedAnalysisOptions,
} from '../types/index.js';

// 각 모드별 최소 히스토리 길이 (윈도우 + 예측 + 검색 공간)
const MIN_HISTORY: Record<string, number> = {
    basic: 75,
    multiTimeframe: 100,
    advanced: 75,
};

export class BacktestService {
    constructor(private engine: EngineService) {}

    /**
     * 백테스트 실행 — 메인 진입점
     * history 전체 OHLC에서 config 범위를 순회하며 예측 vs 실제를 비교한다.
     */
    run(history: OHLC[], symbol: string, config: BacktestConfig): BacktestResult {
        const startTime = Date.now();
        const points: BacktestPointMetrics[] = [];

        for (let idx = config.startIndex; idx <= config.endIndex; idx += config.step) {
            const point = this.evaluatePoint(history, idx, config.mode, config.advancedOptions);
            if (point) points.push(point);
        }

        const aggregate = BacktestService.aggregate(points);

        const fromDate = new Date(history[config.startIndex].time * 1000)
            .toISOString()
            .split('T')[0];
        const toDate = new Date(history[config.endIndex].time * 1000)
            .toISOString()
            .split('T')[0];

        return {
            symbol,
            mode: config.mode,
            dateRange: `${fromDate} ~ ${toDate}`,
            step: config.step,
            elapsedMs: Date.now() - startTime,
            aggregate,
            points,
        };
    }

    /**
     * 단일 테스트 포인트 평가
     * testIndex 시점까지의 데이터만 사용해 예측하고, 실제 미래와 비교한다.
     */
    evaluatePoint(
        history: OHLC[],
        testIndex: number,
        mode: BacktestConfig['mode'],
        advancedOptions?: Partial<AdvancedAnalysisOptions>,
    ): BacktestPointMetrics | null {
        const historySlice = history.slice(0, testIndex + 1);
        const minRequired = MIN_HISTORY[mode];
        if (historySlice.length < minRequired) return null;

        // 모드별 예측 크기 (실제 미래 비교 길이)
        const predictionSize = 10; // 모든 모드에서 10일 예측 (basic/multi/advanced 공통)

        // 미래 데이터가 충분하지 않으면 스킵
        if (testIndex + predictionSize >= history.length) return null;

        // 엔진 실행 — 미래 데이터 완전 차단
        let predicted: number[];
        let confidence68Upper: number[];
        let confidence68Lower: number[];
        let confidence95Upper: number[];
        let confidence95Lower: number[];
        let matchCount: number;
        let confidenceGrade: 'A' | 'B' | 'C' | undefined;

        switch (mode) {
            case 'basic': {
                const result = this.engine.analyze(historySlice, 15, predictionSize);
                predicted = result.scenario;
                confidence68Upper = result.confidence68Upper;
                confidence68Lower = result.confidence68Lower;
                confidence95Upper = result.confidence95Upper;
                confidence95Lower = result.confidence95Lower;
                matchCount = result.matches.length;
                break;
            }
            case 'multiTimeframe': {
                const result = this.engine.analyzeMultiTimeframe(historySlice);
                predicted = result.combined.scenario;
                confidence68Upper = result.combined.confidence68Upper;
                confidence68Lower = result.combined.confidence68Lower;
                confidence95Upper = result.combined.confidence95Upper;
                confidence95Lower = result.combined.confidence95Lower;
                matchCount =
                    result.short.matches.length +
                    result.medium.matches.length +
                    result.long.matches.length;
                confidenceGrade = result.confidence;
                break;
            }
            case 'advanced': {
                const result = this.engine.analyzeAdvanced(
                    historySlice,
                    15,
                    predictionSize,
                    advancedOptions,
                );
                predicted = result.scenario;
                confidence68Upper = result.confidence68Upper;
                confidence68Lower = result.confidence68Lower;
                confidence95Upper = result.confidence95Upper;
                confidence95Lower = result.confidence95Lower;
                matchCount = result.matches.length;
                break;
            }
        }

        // 실제 미래 가격 추출
        const actual = history
            .slice(testIndex + 1, testIndex + 1 + predictionSize)
            .map((d) => d.close);

        // 비교 길이를 최소에 맞춤 (예측 또는 실제가 짧을 수 있음)
        const len = Math.min(predicted.length, actual.length);
        if (len === 0) return null;

        const trimmedPredicted = predicted.slice(0, len);
        const trimmedActual = actual.slice(0, len);
        const currentPrice = historySlice[historySlice.length - 1].close;

        const date = new Date(history[testIndex].time * 1000).toISOString().split('T')[0];

        return {
            date,
            timestamp: history[testIndex].time,
            currentPrice,
            matchCount,
            predicted: trimmedPredicted,
            actual: trimmedActual,
            rmsePercent: BacktestService.rmsePercent(trimmedPredicted, trimmedActual, currentPrice),
            maePercent: BacktestService.maePercent(trimmedPredicted, trimmedActual, currentPrice),
            directionCorrect: BacktestService.directionMatch(
                trimmedPredicted,
                trimmedActual,
                currentPrice,
            ),
            coverage68: BacktestService.coverageRate(
                trimmedActual,
                confidence68Lower.slice(0, len),
                confidence68Upper.slice(0, len),
            ),
            coverage95: BacktestService.coverageRate(
                trimmedActual,
                confidence95Lower.slice(0, len),
                confidence95Upper.slice(0, len),
            ),
            confidenceGrade,
        };
    }

    /**
     * 종합 통계 — 유효한 포인트들의 평균 지표
     */
    static aggregate(points: BacktestPointMetrics[]): BacktestAggregateMetrics {
        if (points.length === 0) {
            return {
                totalTestPoints: 0,
                testPointsWithMatches: 0,
                avgRmsePercent: 0,
                avgMaePercent: 0,
                directionalAccuracy: 0,
                avgCoverage68: 0,
                avgCoverage95: 0,
                avgMatchCount: 0,
            };
        }

        const withMatches = points.filter((p) => p.matchCount > 0);

        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
        const avg = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0);

        const directionCount = points.filter((p) => p.directionCorrect).length;

        return {
            totalTestPoints: points.length,
            testPointsWithMatches: withMatches.length,
            avgRmsePercent: avg(points.map((p) => p.rmsePercent)),
            avgMaePercent: avg(points.map((p) => p.maePercent)),
            directionalAccuracy: (directionCount / points.length) * 100,
            avgCoverage68: avg(points.map((p) => p.coverage68)),
            avgCoverage95: avg(points.map((p) => p.coverage95)),
            avgMatchCount: avg(points.map((p) => p.matchCount)),
        };
    }

    /**
     * RMSE를 현재가 대비 %로 반환
     * RMSE = sqrt(mean((predicted - actual)^2)) / basePrice * 100
     */
    static rmsePercent(predicted: number[], actual: number[], basePrice: number): number {
        if (predicted.length === 0 || basePrice === 0) return 0;
        const len = Math.min(predicted.length, actual.length);
        if (len === 0) return 0;
        let sumSq = 0;
        for (let i = 0; i < len; i++) {
            sumSq += (predicted[i] - actual[i]) ** 2;
        }
        return (Math.sqrt(sumSq / len) / basePrice) * 100;
    }

    /**
     * MAE를 현재가 대비 %로 반환
     * MAE = mean(|predicted - actual|) / basePrice * 100
     */
    static maePercent(predicted: number[], actual: number[], basePrice: number): number {
        if (predicted.length === 0 || basePrice === 0) return 0;
        const len = Math.min(predicted.length, actual.length);
        if (len === 0) return 0;
        let sumAbs = 0;
        for (let i = 0; i < len; i++) {
            sumAbs += Math.abs(predicted[i] - actual[i]);
        }
        return (sumAbs / len / basePrice) * 100;
    }

    /**
     * 방향 일치 여부: 예측과 실제 모두 같은 방향(상승/하락)인지 확인
     * 마지막 예측값 vs 마지막 실제값이 basePrice 대비 같은 방향이면 true
     */
    static directionMatch(predicted: number[], actual: number[], basePrice: number): boolean {
        if (predicted.length === 0 || actual.length === 0 || basePrice === 0) return false;
        const predictedChange = (predicted[predicted.length - 1] - basePrice) / basePrice;
        const actualChange = (actual[actual.length - 1] - basePrice) / basePrice;
        const threshold = 0.005; // ±0.5% 이하는 횡보로 간주
        if (Math.abs(predictedChange) < threshold && Math.abs(actualChange) < threshold) return true;
        return predictedChange * actualChange > 0;
    }

    /**
     * 신뢰구간 커버율: 실제 값 중 구간 안에 들어오는 비율 (0~1)
     */
    static coverageRate(actual: number[], lower: number[], upper: number[]): number {
        const len = Math.min(actual.length, lower.length, upper.length);
        if (len === 0) return 0;
        let covered = 0;
        for (let i = 0; i < len; i++) {
            if (actual[i] >= lower[i] && actual[i] <= upper[i]) {
                covered++;
            }
        }
        return covered / len;
    }
}
