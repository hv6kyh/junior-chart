import { BacktestService } from '../../src/services/backtest.service.js';

describe('BacktestService — static metric functions', () => {
    // ==================== rmsePercent ====================
    describe('rmsePercent', () => {
        test('완벽한 예측 → 0% 에러', () => {
            const prices = [100, 102, 104, 106, 108];
            expect(BacktestService.rmsePercent(prices, prices, 100)).toBe(0);
        });

        test('일정 오차 → 정확한 % 계산', () => {
            const predicted = [100, 100, 100, 100, 100];
            const actual = [110, 110, 110, 110, 110];
            // 각 차이 = 10, RMSE = 10, basePrice = 100 → 10%
            expect(BacktestService.rmsePercent(predicted, actual, 100)).toBeCloseTo(10, 5);
        });

        test('다양한 오차 → RMSE 계산 확인', () => {
            const predicted = [100, 100];
            const actual = [103, 107];
            // 차이: 3, 7 → 제곱합: 9 + 49 = 58 → 평균: 29 → sqrt: ~5.385
            // 5.385 / 100 * 100 = 5.385%
            const result = BacktestService.rmsePercent(predicted, actual, 100);
            expect(result).toBeCloseTo(5.385, 2);
        });

        test('빈 배열 → 0 반환', () => {
            expect(BacktestService.rmsePercent([], [], 100)).toBe(0);
        });

        test('basePrice 0 → 0 반환', () => {
            expect(BacktestService.rmsePercent([100], [110], 0)).toBe(0);
        });

        test('길이가 다른 배열 → 짧은 쪽 기준', () => {
            const predicted = [100, 100, 100];
            const actual = [110, 110];
            // len = 2, 차이 10씩 → RMSE = 10 → 10%
            expect(BacktestService.rmsePercent(predicted, actual, 100)).toBeCloseTo(10, 5);
        });
    });

    // ==================== maePercent ====================
    describe('maePercent', () => {
        test('완벽한 예측 → 0% 에러', () => {
            const prices = [100, 102, 104];
            expect(BacktestService.maePercent(prices, prices, 100)).toBe(0);
        });

        test('일정 오차 → 정확한 % 계산', () => {
            const predicted = [100, 100, 100];
            const actual = [105, 110, 115];
            // 차이: 5, 10, 15 → 평균: 10 → 10 / 100 * 100 = 10%
            expect(BacktestService.maePercent(predicted, actual, 100)).toBeCloseTo(10, 5);
        });

        test('양/음 혼합 오차', () => {
            const predicted = [100, 100];
            const actual = [90, 110];
            // |차이|: 10, 10 → 평균: 10 → 10%
            expect(BacktestService.maePercent(predicted, actual, 100)).toBeCloseTo(10, 5);
        });

        test('빈 배열 → 0 반환', () => {
            expect(BacktestService.maePercent([], [], 100)).toBe(0);
        });
    });

    // ==================== directionMatch ====================
    describe('directionMatch', () => {
        test('둘 다 상승 → true', () => {
            expect(BacktestService.directionMatch([100, 110], [100, 105], 100)).toBe(true);
        });

        test('둘 다 하락 → true', () => {
            expect(BacktestService.directionMatch([100, 90], [100, 95], 100)).toBe(true);
        });

        test('예측 상승, 실제 하락 → false', () => {
            expect(BacktestService.directionMatch([100, 110], [100, 90], 100)).toBe(false);
        });

        test('예측 하락, 실제 상승 → false', () => {
            expect(BacktestService.directionMatch([100, 90], [100, 110], 100)).toBe(false);
        });

        test('둘 다 횡보 (변화 없음) → true', () => {
            expect(BacktestService.directionMatch([100, 100], [100, 100], 100)).toBe(true);
        });

        test('빈 배열 → false', () => {
            expect(BacktestService.directionMatch([], [], 100)).toBe(false);
        });

        test('단일 값 배열 → 방향 판단', () => {
            expect(BacktestService.directionMatch([110], [105], 100)).toBe(true); // 둘 다 상승
            expect(BacktestService.directionMatch([110], [90], 100)).toBe(false); // 반대
        });
    });

    // ==================== coverageRate ====================
    describe('coverageRate', () => {
        test('모두 구간 내 → 1.0', () => {
            const actual = [100, 105, 110];
            const lower = [90, 90, 90];
            const upper = [120, 120, 120];
            expect(BacktestService.coverageRate(actual, lower, upper)).toBe(1);
        });

        test('모두 구간 밖 → 0.0', () => {
            const actual = [200, 200, 200];
            const lower = [90, 90, 90];
            const upper = [120, 120, 120];
            expect(BacktestService.coverageRate(actual, lower, upper)).toBe(0);
        });

        test('50% 커버 → 0.5', () => {
            const actual = [100, 200]; // 첫 번째만 구간 내
            const lower = [90, 90];
            const upper = [120, 120];
            expect(BacktestService.coverageRate(actual, lower, upper)).toBe(0.5);
        });

        test('경계값 포함 → 커버로 인정', () => {
            const actual = [90, 120]; // lower와 upper 경계값
            const lower = [90, 90];
            const upper = [120, 120];
            expect(BacktestService.coverageRate(actual, lower, upper)).toBe(1);
        });

        test('빈 배열 → 0', () => {
            expect(BacktestService.coverageRate([], [], [])).toBe(0);
        });
    });

    // ==================== aggregate ====================
    describe('aggregate', () => {
        test('빈 포인트 → 모든 지표 0', () => {
            const result = BacktestService.aggregate([]);
            expect(result.totalTestPoints).toBe(0);
            expect(result.avgRmsePercent).toBe(0);
            expect(result.directionalAccuracy).toBe(0);
        });

        test('단일 포인트 집계', () => {
            const result = BacktestService.aggregate([
                {
                    date: '2025-06-01',
                    timestamp: 1000,
                    currentPrice: 100,
                    matchCount: 5,
                    predicted: [105],
                    actual: [103],
                    rmsePercent: 2,
                    maePercent: 2,
                    directionCorrect: true,
                    coverage68: 0.8,
                    coverage95: 1.0,
                },
            ]);
            expect(result.totalTestPoints).toBe(1);
            expect(result.testPointsWithMatches).toBe(1);
            expect(result.avgRmsePercent).toBe(2);
            expect(result.directionalAccuracy).toBe(100);
            expect(result.avgCoverage68).toBe(0.8);
            expect(result.avgCoverage95).toBe(1.0);
            expect(result.avgMatchCount).toBe(5);
        });

        test('다수 포인트 평균 계산', () => {
            const result = BacktestService.aggregate([
                {
                    date: '2025-06-01',
                    timestamp: 1000,
                    currentPrice: 100,
                    matchCount: 3,
                    predicted: [],
                    actual: [],
                    rmsePercent: 4,
                    maePercent: 3,
                    directionCorrect: true,
                    coverage68: 0.6,
                    coverage95: 0.8,
                },
                {
                    date: '2025-06-06',
                    timestamp: 2000,
                    currentPrice: 105,
                    matchCount: 7,
                    predicted: [],
                    actual: [],
                    rmsePercent: 6,
                    maePercent: 5,
                    directionCorrect: false,
                    coverage68: 0.4,
                    coverage95: 0.6,
                },
            ]);
            expect(result.totalTestPoints).toBe(2);
            expect(result.testPointsWithMatches).toBe(2);
            expect(result.avgRmsePercent).toBe(5); // (4+6)/2
            expect(result.avgMaePercent).toBe(4); // (3+5)/2
            expect(result.directionalAccuracy).toBe(50); // 1/2 * 100
            expect(result.avgCoverage68).toBeCloseTo(0.5); // (0.6+0.4)/2
            expect(result.avgCoverage95).toBeCloseTo(0.7); // (0.8+0.6)/2
            expect(result.avgMatchCount).toBe(5); // (3+7)/2
        });

        test('매칭 없는 포인트 카운트', () => {
            const result = BacktestService.aggregate([
                {
                    date: '2025-06-01',
                    timestamp: 1000,
                    currentPrice: 100,
                    matchCount: 0,
                    predicted: [],
                    actual: [],
                    rmsePercent: 0,
                    maePercent: 0,
                    directionCorrect: false,
                    coverage68: 0,
                    coverage95: 0,
                },
                {
                    date: '2025-06-06',
                    timestamp: 2000,
                    currentPrice: 105,
                    matchCount: 5,
                    predicted: [],
                    actual: [],
                    rmsePercent: 3,
                    maePercent: 2,
                    directionCorrect: true,
                    coverage68: 0.8,
                    coverage95: 1.0,
                },
            ]);
            expect(result.totalTestPoints).toBe(2);
            expect(result.testPointsWithMatches).toBe(1);
        });
    });
});
