import { EngineService } from '../../src/services/engine.service.js';
import { BacktestService } from '../../src/services/backtest.service.js';
import { OHLC, BacktestConfig } from '../../src/types/index.js';

/**
 * 결정론적 OHLC 테스트 데이터 생성
 * 사인파 + 상승 트렌드로 재현 가능한 패턴을 생성한다.
 * count 개의 거래일 데이터를 반환 (기본 300일 = ~1.2년)
 */
function generateTestData(count = 300): OHLC[] {
    const data: OHLC[] = [];
    const basePrice = 100;
    const baseTime = Math.floor(new Date('2024-01-01').getTime() / 1000);
    const daySeconds = 86400;

    for (let i = 0; i < count; i++) {
        // 사인파 (주기 ~30일) + 완만한 상승 트렌드
        const trend = i * 0.05;
        const cycle = Math.sin((i / 30) * 2 * Math.PI) * 5;
        const close = basePrice + trend + cycle;
        const open = close - (Math.sin(i) * 0.5); // 약간의 변동
        const high = Math.max(open, close) + Math.abs(Math.sin(i * 0.7)) * 2;
        const low = Math.min(open, close) - Math.abs(Math.cos(i * 0.7)) * 2;
        const volume = 1000 + Math.floor(Math.abs(Math.sin(i * 0.3)) * 5000);

        data.push({
            time: baseTime + i * daySeconds,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume,
        });
    }

    return data;
}

describe('BacktestService — integration tests', () => {
    let engine: EngineService;
    let service: BacktestService;
    let testData: OHLC[];

    beforeAll(() => {
        engine = new EngineService();
        service = new BacktestService(engine);
        testData = generateTestData(300);
    });

    describe('basic 모드', () => {
        test('유효한 범위로 실행하면 결과를 반환한다', () => {
            const config: BacktestConfig = {
                mode: 'basic',
                step: 20,
                startIndex: 100,
                endIndex: 250,
            };

            const result = service.run(testData, 'TEST', config);

            expect(result.symbol).toBe('TEST');
            expect(result.mode).toBe('basic');
            expect(result.step).toBe(20);
            expect(result.points.length).toBeGreaterThan(0);
            expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
            expect(result.dateRange).toMatch(/^\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}$/);
        });

        test('각 포인트의 지표 값이 유효한 범위에 있다', () => {
            const config: BacktestConfig = {
                mode: 'basic',
                step: 30,
                startIndex: 100,
                endIndex: 250,
            };

            const result = service.run(testData, 'TEST', config);

            for (const point of result.points) {
                expect(point.rmsePercent).toBeGreaterThanOrEqual(0);
                expect(point.maePercent).toBeGreaterThanOrEqual(0);
                expect(typeof point.directionCorrect).toBe('boolean');
                expect(point.coverage68).toBeGreaterThanOrEqual(0);
                expect(point.coverage68).toBeLessThanOrEqual(1);
                expect(point.coverage95).toBeGreaterThanOrEqual(0);
                expect(point.coverage95).toBeLessThanOrEqual(1);
                expect(point.matchCount).toBeGreaterThanOrEqual(0);
                expect(point.predicted.length).toBeGreaterThan(0);
                expect(point.actual.length).toBeGreaterThan(0);
                expect(point.currentPrice).toBeGreaterThan(0);
            }
        });

        test('aggregate 지표 값이 유효한 범위에 있다', () => {
            const config: BacktestConfig = {
                mode: 'basic',
                step: 20,
                startIndex: 100,
                endIndex: 250,
            };

            const result = service.run(testData, 'TEST', config);
            const agg = result.aggregate;

            expect(agg.totalTestPoints).toBeGreaterThan(0);
            expect(agg.avgRmsePercent).toBeGreaterThanOrEqual(0);
            expect(agg.avgMaePercent).toBeGreaterThanOrEqual(0);
            expect(agg.directionalAccuracy).toBeGreaterThanOrEqual(0);
            expect(agg.directionalAccuracy).toBeLessThanOrEqual(100);
            expect(agg.avgCoverage68).toBeGreaterThanOrEqual(0);
            expect(agg.avgCoverage68).toBeLessThanOrEqual(1);
            expect(agg.avgCoverage95).toBeGreaterThanOrEqual(0);
            expect(agg.avgCoverage95).toBeLessThanOrEqual(1);
        });
    });

    describe('multiTimeframe 모드', () => {
        test('유효한 범위로 실행하면 결과를 반환한다', () => {
            const config: BacktestConfig = {
                mode: 'multiTimeframe',
                step: 30,
                startIndex: 120,
                endIndex: 250,
            };

            const result = service.run(testData, 'TEST', config);

            expect(result.mode).toBe('multiTimeframe');
            expect(result.points.length).toBeGreaterThan(0);
        });

        test('confidenceGrade가 포함된다', () => {
            const config: BacktestConfig = {
                mode: 'multiTimeframe',
                step: 50,
                startIndex: 120,
                endIndex: 250,
            };

            const result = service.run(testData, 'TEST', config);

            for (const point of result.points) {
                expect(['A', 'B', 'C']).toContain(point.confidenceGrade);
            }
        });
    });

    describe('advanced 모드', () => {
        test('DTW + ATR 옵션으로 실행', () => {
            const config: BacktestConfig = {
                mode: 'advanced',
                step: 30,
                startIndex: 100,
                endIndex: 250,
                advancedOptions: {
                    useDTW: true,
                    useATR: true,
                    dtwWeight: 0.2,
                    atrPeriod: 14,
                },
            };

            const result = service.run(testData, 'TEST', config);

            expect(result.mode).toBe('advanced');
            expect(result.points.length).toBeGreaterThan(0);
        });
    });

    describe('step 파라미터 동작', () => {
        test('step이 클수록 테스트 포인트 수가 줄어든다', () => {
            const configSmallStep: BacktestConfig = {
                mode: 'basic',
                step: 10,
                startIndex: 100,
                endIndex: 250,
            };
            const configLargeStep: BacktestConfig = {
                mode: 'basic',
                step: 40,
                startIndex: 100,
                endIndex: 250,
            };

            const resultSmall = service.run(testData, 'TEST', configSmallStep);
            const resultLarge = service.run(testData, 'TEST', configLargeStep);

            expect(resultSmall.points.length).toBeGreaterThan(resultLarge.points.length);
        });
    });

    describe('엣지 케이스', () => {
        test('히스토리가 너무 짧으면 포인트 없이 반환', () => {
            const shortData = testData.slice(0, 30);
            const config: BacktestConfig = {
                mode: 'basic',
                step: 5,
                startIndex: 10,
                endIndex: 20,
            };

            const result = service.run(shortData, 'TEST', config);
            expect(result.points.length).toBe(0);
            expect(result.aggregate.totalTestPoints).toBe(0);
        });

        test('endIndex가 데이터 끝에 가까우면 미래 부족 포인트는 건너뛴다', () => {
            const config: BacktestConfig = {
                mode: 'basic',
                step: 5,
                startIndex: 280,
                endIndex: 295,
            };

            const result = service.run(testData, 'TEST', config);
            // testIndex + 10 >= 300이면 스킵되므로 포인트 수가 제한됨
            for (const point of result.points) {
                expect(point.actual.length).toBeGreaterThan(0);
            }
        });
    });
});
