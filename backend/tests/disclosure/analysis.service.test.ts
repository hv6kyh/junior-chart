// backend/tests/disclosure/analysis.service.test.ts
import { AnalysisService } from '../../src/services/disclosure/analysis.service.js';

describe('AnalysisService', () => {
  describe('calculateStats', () => {
    test('수익률 배열로 통계를 산출한다', () => {
      const returns = [5.0, -2.0, 8.0, 3.0, -1.0, 10.0, 4.0, 6.0, -3.0, 7.0];
      const stats = AnalysisService.calculateStats(returns);

      expect(stats.sampleCount).toBe(10);
      expect(stats.avgReturn).toBeCloseTo(3.7, 1);
      expect(stats.medianReturn).toBeCloseTo(4.5, 1);
      expect(stats.positiveRate).toBeCloseTo(0.7, 2);
      expect(stats.stddev).toBeGreaterThan(0);
      expect(stats.ciLower68).toBeLessThan(stats.avgReturn!);
      expect(stats.ciUpper68).toBeGreaterThan(stats.avgReturn!);
      expect(stats.ciLower95).toBeLessThan(stats.ciLower68!);
      expect(stats.ciUpper95).toBeGreaterThan(stats.ciUpper68!);
    });

    test('빈 배열은 null 통계를 반환한다', () => {
      const stats = AnalysisService.calculateStats([]);

      expect(stats.sampleCount).toBe(0);
      expect(stats.avgReturn).toBeNull();
      expect(stats.medianReturn).toBeNull();
    });

    test('표본 수 30 미만이면 t-분포 보정을 적용한다', () => {
      const smallSample = [5.0, -2.0, 8.0, 3.0, -1.0];
      const stats = AnalysisService.calculateStats(smallSample);

      expect(stats.sampleCount).toBe(5);
      expect(stats.ciUpper95! - stats.ciLower95!).toBeGreaterThan(0);
    });
  });
});
