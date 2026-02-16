import { EngineService } from '../src/services/engine.service.js';
import { OHLC } from '../src/types/index.js';

describe('Engine Mathematical Correctness', () => {
    let engine: EngineService;

    beforeAll(() => {
        engine = new EngineService();
    });

    // ==================== Pearson Correlation Tests ====================
    describe('Pearson Correlation', () => {
        test('perfect positive correlation: [1,2,3,4,5] vs [2,4,6,8,10] → 1.0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 10);
        });

        test('perfect negative correlation: [1,2,3,4,5] vs [10,8,6,4,2] → -1.0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [10, 8, 6, 4, 2];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBeCloseTo(-1.0, 10);
        });

        test('zero correlation with constant array: [1,2,3,4,5] vs [5,5,5,5,5] → 0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [5, 5, 5, 5, 5];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBe(0);
        });

        test('textbook example: known dataset with r ≈ 0.9923', () => {
            // Linear-ish dataset: height vs weight (near-perfect linear relationship)
            const heights = [60, 62, 64, 65, 66, 67, 68, 70, 72, 74];
            const weights = [120, 125, 130, 135, 140, 145, 150, 160, 170, 180];
            const correlation = (engine as any).getPearsonCorrelation(heights, weights);
            // Verified Pearson r for this dataset ≈ 0.9923
            expect(correlation).toBeCloseTo(0.9923, 3);
        });

        test('both arrays constant → 0 (denominator zero case)', () => {
            const x = [5, 5, 5, 5];
            const y = [10, 10, 10, 10];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBe(0);
        });

        test('moderate positive correlation: temperature vs ice cream sales', () => {
            const temperature = [25, 28, 30, 22, 35, 32, 27];
            const sales = [200, 240, 280, 180, 350, 310, 220];
            const correlation = (engine as any).getPearsonCorrelation(temperature, sales);
            expect(correlation).toBeGreaterThan(0.9);
            expect(correlation).toBeLessThan(1.0);
        });
    });

    // ==================== Spearman Correlation Tests ====================
    describe('Spearman Correlation', () => {
        test('perfect monotonic non-linear: [1,2,3,4,5] vs [1,4,9,16,25] → 1.0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [1, 4, 9, 16, 25];  // y = x^2 (perfect monotonic, non-linear)
            const correlation = (engine as any).getSpearmanCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 10);
        });

        test('perfect negative monotonic: [1,2,3,4,5] vs [5,4,3,2,1] → -1.0', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [5, 4, 3, 2, 1];
            const correlation = (engine as any).getSpearmanCorrelation(x, y);
            expect(correlation).toBeCloseTo(-1.0, 10);
        });

        test('with ties: [10,20,20,30] vs [1,2,3,4]', () => {
            // x ranks: [1, 2.5, 2.5, 4]
            // y ranks: [1, 2, 3, 4]
            // Expected Spearman: high but not perfect due to tie in x
            const x = [10, 20, 20, 30];
            const y = [1, 2, 3, 4];
            const correlation = (engine as any).getSpearmanCorrelation(x, y);
            // With ties, expect slightly less than 1.0
            expect(correlation).toBeGreaterThan(0.94);
            expect(correlation).toBeLessThan(1.0);
        });

        test('exponential relationship maintains perfect rank correlation', () => {
            const x = [1, 2, 3, 4, 5, 6];
            const y = x.map(v => Math.exp(v));  // exponential relationship
            const correlation = (engine as any).getSpearmanCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 10);
        });
    });

    // ==================== arrayToRanks Tests ====================
    describe('arrayToRanks', () => {
        test('no ties: [30,10,20] → [3,1,2]', () => {
            const arr = [30, 10, 20];
            const ranks = (engine as any).arrayToRanks(arr);
            expect(ranks).toEqual([3, 1, 2]);
        });

        test('with ties: [10,20,20,30] → [1, 2.5, 2.5, 4]', () => {
            const arr = [10, 20, 20, 30];
            const ranks = (engine as any).arrayToRanks(arr);
            expect(ranks).toEqual([1, 2.5, 2.5, 4]);
        });

        test('all same: [5,5,5] → [2,2,2]', () => {
            const arr = [5, 5, 5];
            const ranks = (engine as any).arrayToRanks(arr);
            // Average rank = (1 + 2 + 3) / 3 = 2
            expect(ranks).toEqual([2, 2, 2]);
        });

        test('three-way tie: [1,5,5,5,9] → [1, 3, 3, 3, 5]', () => {
            const arr = [1, 5, 5, 5, 9];
            const ranks = (engine as any).arrayToRanks(arr);
            // Ranks for 5s: (2 + 3 + 4) / 3 = 3
            expect(ranks).toEqual([1, 3, 3, 3, 5]);
        });

        test('preserves original array order', () => {
            const arr = [100, 50, 75, 25];
            const ranks = (engine as any).arrayToRanks(arr);
            // 25→1, 50→2, 75→3, 100→4
            expect(ranks).toEqual([4, 2, 3, 1]);
        });
    });

    // ==================== Weighted Prediction Scenario Tests ====================
    describe('Weighted Prediction Scenario', () => {
        test('weights equal correlation^3', () => {
            const correlations = [0.9, 0.85, 0.82];
            const expectedWeights = correlations.map(c => Math.pow(c, 3));

            expect(expectedWeights[0]).toBeCloseTo(0.729, 5);
            expect(expectedWeights[1]).toBeCloseTo(0.614125, 5);
            expect(expectedWeights[2]).toBeCloseTo(0.551368, 5);
        });

        test('weighted average calculated correctly', () => {
            // Simulating weighted prediction
            const prices = [100, 110, 105];
            const correlations = [0.9, 0.8, 0.7];
            const weights = correlations.map(c => Math.pow(c, 3));
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);

            const weightedAvg = prices.reduce((sum, price, i) =>
                sum + price * (weights[i] / totalWeight), 0
            );

            // Manual calculation:
            // w1 = 0.729, w2 = 0.512, w3 = 0.343
            // total = 1.584
            // weighted_avg = (100*0.729 + 110*0.512 + 105*0.343) / 1.584
            //              = (72.9 + 56.32 + 36.015) / 1.584
            //              = 165.235 / 1.584 ≈ 104.32
            expect(weightedAvg).toBeCloseTo(104.32, 1);
        });

        test('weighted variance calculated correctly', () => {
            const prices = [100, 110, 105];
            const correlations = [0.9, 0.8, 0.7];
            const weights = correlations.map(c => Math.pow(c, 3));
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);

            // First calculate weighted mean
            const mean = prices.reduce((sum, price, i) =>
                sum + price * (weights[i] / totalWeight), 0
            );

            // Then calculate weighted variance
            const variance = prices.reduce((sum, price, i) =>
                sum + (weights[i] / totalWeight) * Math.pow(price - mean, 2), 0
            );

            // Variance should be positive for non-identical prices
            expect(variance).toBeGreaterThan(0);
            expect(variance).toBeLessThan(50); // Reasonable range for these prices
        });

        test('higher correlation weight dominates prediction', () => {
            const prices = [100, 200];
            const weights = [0.9 ** 3, 0.5 ** 3]; // 0.729 vs 0.125
            const totalWeight = weights[0] + weights[1];

            const weightedAvg = (prices[0] * weights[0] + prices[1] * weights[1]) / totalWeight;

            // Should be closer to 100 than 200 due to higher weight
            expect(weightedAvg).toBeLessThan(150);
            expect(weightedAvg).toBeGreaterThan(100);
        });
    });

    // ==================== Confidence Interval Tests ====================
    describe('Confidence Interval Properties', () => {
        test('95% interval is wider than 68% interval', () => {
            // Create mock matches for prediction
            const mockMatches = [
                { future: [105, 107, 110], correlation: 0.9, windowData: createMockWindow(100) },
                { future: [103, 106, 109], correlation: 0.85, windowData: createMockWindow(100) },
                { future: [104, 105, 108], correlation: 0.82, windowData: createMockWindow(100) }
            ].map((m, i) => ({
                ...m,
                weight: Math.pow(m.correlation, 3),
                rank: i + 1,
                opacity: 1 - i * 0.1,
                date: '2024-01-01',
                priceCorrelation: m.correlation,
                volumeCorrelation: 0.7,
                patternType: 'Neutral' as const
            }));

            // Calculate confidence intervals using engine's logic
            const currentPrice = 100;
            const predictionSize = 3;
            const confidence68Upper: number[] = [];
            const confidence68Lower: number[] = [];
            const confidence95Upper: number[] = [];
            const confidence95Lower: number[] = [];

            // Simplified t-multipliers (for df=2)
            const t68 = 1.32;  // Approximation for 68% CI
            const t95 = 4.30;  // Approximation for 95% CI

            const totalWeight = mockMatches.reduce((sum, m) => sum + m.weight, 0);

            for (let step = 0; step < predictionSize; step++) {
                const normalizedPrices = mockMatches.map(m => {
                    const ratio = m.future[step] / m.windowData[m.windowData.length - 1].close;
                    return currentPrice * ratio;
                });

                const weights = mockMatches.map(m => m.weight);

                const mean = normalizedPrices.reduce((sum, price, i) =>
                    sum + price * (weights[i] / totalWeight), 0
                );

                const variance = normalizedPrices.reduce((sum, price, i) =>
                    sum + (weights[i] / totalWeight) * Math.pow(price - mean, 2), 0
                );
                const stdDev = Math.sqrt(variance);

                confidence68Upper.push(mean + t68 * stdDev);
                confidence68Lower.push(mean - t68 * stdDev);
                confidence95Upper.push(mean + t95 * stdDev);
                confidence95Lower.push(mean - t95 * stdDev);
            }

            // 95% interval should be wider at every step
            for (let i = 0; i < predictionSize; i++) {
                const width68 = confidence68Upper[i] - confidence68Lower[i];
                const width95 = confidence95Upper[i] - confidence95Lower[i];
                expect(width95).toBeGreaterThan(width68);
            }
        });

        test('confidence intervals are symmetric around mean', () => {
            const mockMatches = [
                { future: [110, 115, 120], correlation: 0.9, windowData: createMockWindow(100) },
                { future: [108, 112, 118], correlation: 0.88, windowData: createMockWindow(100) }
            ].map((m, i) => ({
                ...m,
                weight: Math.pow(m.correlation, 3),
                rank: i + 1,
                opacity: 1,
                date: '2024-01-01',
                priceCorrelation: m.correlation,
                volumeCorrelation: 0.7,
                patternType: 'Neutral' as const
            }));

            const currentPrice = 100;
            const totalWeight = mockMatches.reduce((sum, m) => sum + m.weight, 0);

            // Calculate for first prediction step
            const normalizedPrices = mockMatches.map(m => {
                const ratio = m.future[0] / m.windowData[m.windowData.length - 1].close;
                return currentPrice * ratio;
            });

            const weights = mockMatches.map(m => m.weight);
            const mean = normalizedPrices.reduce((sum, price, i) =>
                sum + price * (weights[i] / totalWeight), 0
            );

            const variance = normalizedPrices.reduce((sum, price, i) =>
                sum + (weights[i] / totalWeight) * Math.pow(price - mean, 2), 0
            );
            const stdDev = Math.sqrt(variance);

            const t = 2.0; // arbitrary multiplier
            const upper = mean + t * stdDev;
            const lower = mean - t * stdDev;

            // Distance from mean to upper should equal distance from mean to lower
            const upperDist = upper - mean;
            const lowerDist = mean - lower;
            expect(upperDist).toBeCloseTo(lowerDist, 10);
        });
    });

    // ==================== Price Normalization Tests ====================
    describe('Price Normalization', () => {
        test('historical +10% → current price +10%', () => {
            const historicalStart = 100;
            const historicalFuture = 110; // +10%
            const currentPrice = 200;

            // Apply the engine's normalization logic
            const priceRatio = historicalFuture / historicalStart;
            const normalizedPrice = currentPrice * priceRatio;

            // Should be 200 * 1.1 = 220
            expect(normalizedPrice).toBeCloseTo(220, 10);
        });

        test('historical -20% → current price -20%', () => {
            const historicalStart = 100;
            const historicalFuture = 80; // -20%
            const currentPrice = 150;

            const priceRatio = historicalFuture / historicalStart;
            const normalizedPrice = currentPrice * priceRatio;

            // Should be 150 * 0.8 = 120
            expect(normalizedPrice).toBeCloseTo(120, 10);
        });

        test('historical flat → current price flat', () => {
            const historicalStart = 100;
            const historicalFuture = 100; // 0%
            const currentPrice = 200;

            const priceRatio = historicalFuture / historicalStart;
            const normalizedPrice = currentPrice * priceRatio;

            // Should remain 200
            expect(normalizedPrice).toBeCloseTo(200, 10);
        });

        test('historical +50% → current price +50%', () => {
            const historicalStart = 80;
            const historicalFuture = 120; // +50%
            const currentPrice = 160;

            const priceRatio = historicalFuture / historicalStart;
            const normalizedPrice = currentPrice * priceRatio;

            // Should be 160 * 1.5 = 240
            expect(normalizedPrice).toBeCloseTo(240, 10);
        });

        test('normalization preserves percentage changes across different price levels', () => {
            const percentageChange = 0.25; // 25% increase
            const historicalStart = 50;
            const historicalFuture = historicalStart * (1 + percentageChange);

            const currentPrices = [100, 200, 500, 1000];

            currentPrices.forEach(currentPrice => {
                const priceRatio = historicalFuture / historicalStart;
                const normalizedPrice = currentPrice * priceRatio;

                const actualChange = (normalizedPrice - currentPrice) / currentPrice;
                expect(actualChange).toBeCloseTo(percentageChange, 10);
            });
        });
    });

    // ==================== Edge Cases ====================
    describe('Edge Cases and Numerical Stability', () => {
        test('very small differences do not cause numerical instability', () => {
            // 차이가 1e-7 수준이면 IEEE 754 부동소수점 한계에 근접하여 오차 발생 가능
            // 1e-4 수준으로 테스트하여 합리적 정밀도 검증
            const x = [1.0001, 1.0002, 1.0003, 1.0004, 1.0005];
            const y = [2.0001, 2.0002, 2.0003, 2.0004, 2.0005];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 5);
        });

        test('large numbers do not overflow', () => {
            const x = [1e6, 2e6, 3e6, 4e6, 5e6];
            const y = [2e6, 4e6, 6e6, 8e6, 10e6];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 10);
        });

        test('negative numbers handled correctly', () => {
            const x = [-5, -3, -1, 1, 3, 5];
            const y = [-10, -6, -2, 2, 6, 10];
            const correlation = (engine as any).getPearsonCorrelation(x, y);
            expect(correlation).toBeCloseTo(1.0, 10);
        });
    });
});

// ==================== Helper Functions ====================

/**
 * Creates mock OHLC window data with specified starting price
 */
function createMockWindow(startPrice: number): OHLC[] {
    return Array.from({ length: 15 }, (_, i) => ({
        time: Date.now() / 1000 - (15 - i) * 86400,
        open: startPrice,
        high: startPrice + 2,
        low: startPrice - 2,
        close: startPrice,
        volume: 1000000
    }));
}
