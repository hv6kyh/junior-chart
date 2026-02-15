import {
  getTMultiplier,
  classifyPattern,
  calculateConvergence,
  calculateVolatilityContext,
  generateNoMatchContext,
} from '../src/utils/statistics.js';
import { OHLC } from '../src/types/index.js';

describe('statistics utilities', () => {
  // ==================== getTMultiplier ====================
  describe('getTMultiplier', () => {
    test(`df=4, confidence='95'는 2.776 반환`, () => {
      const result = getTMultiplier(4, '95');
      expect(result).toBe(2.776);
    });

    test(`df=4, confidence='68'은 1.19 반환`, () => {
      const result = getTMultiplier(4, '68');
      expect(result).toBe(1.19);
    });

    test(`df=30 이상, confidence='95'는 1.96 반환 (정규분포)`, () => {
      const result = getTMultiplier(30, '95');
      expect(result).toBe(1.96);

      const result40 = getTMultiplier(40, '95');
      expect(result40).toBe(1.96);
    });

    test(`df=30 이상, confidence='68'은 1.0 반환 (정규분포)`, () => {
      const result = getTMultiplier(30, '68');
      expect(result).toBe(1.0);

      const result50 = getTMultiplier(50, '68');
      expect(result50).toBe(1.0);
    });

    test(`df=1, confidence='95'는 12.706 반환`, () => {
      const result = getTMultiplier(1, '95');
      expect(result).toBe(12.706);
    });

    test(`df=12 (10과 15 사이) 선형 보간으로 2.228과 2.131 사이 값 반환`, () => {
      const result = getTMultiplier(12, '95');
      expect(result).toBeGreaterThan(2.131);
      expect(result).toBeLessThan(2.228);
      // df=12는 정확히 중간이므로 평균값에 가까워야 함
      const expected = 2.228 + ((12 - 10) / (15 - 10)) * (2.131 - 2.228);
      expect(result).toBeCloseTo(expected, 3);
    });

    test(`df < 1인 경우 df=1 값 반환`, () => {
      const result = getTMultiplier(0, '95');
      expect(result).toBe(12.706);

      const resultNegative = getTMultiplier(-5, '95');
      expect(resultNegative).toBe(12.706);
    });
  });

  // ==================== classifyPattern ====================
  describe('classifyPattern', () => {
    test(`급등 후 조정 패턴은 'surge_pullback' 반환`, () => {
      // 전반 +5%, 후반 -2% = 급등 후 조정
      const prices = [100, 102, 104, 105, 103, 102, 101];
      const result = classifyPattern(prices);

      expect(result.type).toBe('surge_pullback');
      expect(result.label).toBe('급등 후 조정');
      expect(result.description).toContain('상승 에너지');
    });

    test(`V자 반등 패턴은 'v_rebound' 반환`, () => {
      // 하락 후 빠른 회복
      const prices = [100, 98, 95, 96, 99, 101, 102];
      const result = classifyPattern(prices);

      expect(result.type).toBe('v_rebound');
      expect(result.label).toBe('V자 반등');
      expect(result.description).toContain('하락 후 빠른 회복');
    });

    test(`완만한 상승 패턴은 'steady_rise' 반환`, () => {
      // 꾸준한 우상향
      const prices = [100, 101, 102, 103, 104, 105, 106];
      const result = classifyPattern(prices);

      expect(result.type).toBe('steady_rise');
      expect(result.label).toBe('완만한 상승');
      expect(result.description).toContain('꾸준한 우상향');
    });

    test(`횡보 패턴은 'sideways' 반환`, () => {
      // 좁은 범위 내 등락
      const prices = [100, 101, 99, 100, 101, 100, 99];
      const result = classifyPattern(prices);

      expect(result.type).toBe('sideways');
      expect(result.label).toBe('횡보 박스권');
      expect(result.description).toContain('좁은 범위 내 등락');
    });

    test(`급락 패턴은 'sharp_decline' 반환`, () => {
      // 지속적인 하락
      const prices = [100, 98, 95, 92, 90, 88, 86];
      const result = classifyPattern(prices);

      expect(result.type).toBe('sharp_decline');
      expect(result.label).toBe('급락');
      expect(result.description).toContain('지속적인 하락');
    });

    test(`복합 패턴은 'unknown' 반환`, () => {
      // 뚜렷한 패턴 없음
      const prices = [100, 105, 98, 103, 97, 102, 100];
      const result = classifyPattern(prices);

      expect(result.type).toBe('unknown');
      expect(result.label).toBe('복합 패턴');
      expect(result.description).toContain('뚜렷한 유형으로 분류하기 어려운');
    });

    test(`데이터가 5개 미만이면 'unknown' 반환`, () => {
      const prices = [100, 102, 104];
      const result = classifyPattern(prices);

      expect(result.type).toBe('unknown');
      expect(result.label).toBe('복합 패턴');
    });
  });

  // ==================== calculateConvergence ====================
  describe('calculateConvergence', () => {
    test(`모든 경로가 동일하면 score 1에 가깝고 label은 'convergent'`, () => {
      const futurePaths = [
        [100, 101, 102, 103],
        [100, 101, 102, 103],
        [100, 101, 102, 103],
      ];
      const currentPrice = 100;

      const result = calculateConvergence(futurePaths, currentPrice);

      expect(result.score).toBeGreaterThan(0.9);
      expect(result.label).toBe('convergent');
    });

    test(`경로가 반대 방향이면 score 0에 가깝고 label은 'divergent' 또는 'neutral'`, () => {
      const futurePaths = [
        [100, 110, 120, 130],  // 상승
        [100, 90, 80, 70],     // 하락
        [100, 105, 85, 95],    // 혼재
      ];
      const currentPrice = 100;

      const result = calculateConvergence(futurePaths, currentPrice);

      expect(result.score).toBeLessThan(0.5);
      // label은 divergent (score <= 0.3) 또는 neutral (0.3 < score < 0.7)
      expect(['divergent', 'neutral']).toContain(result.label);
    });

    test(`경로가 1개만 있으면 score 1, label 'convergent'`, () => {
      const futurePaths = [[100, 101, 102]];
      const currentPrice = 100;

      const result = calculateConvergence(futurePaths, currentPrice);

      expect(result.score).toBe(1);
      expect(result.label).toBe('convergent');
    });

    test(`빈 경로 배열은 score 1, label 'convergent'`, () => {
      const futurePaths: number[][] = [];
      const currentPrice = 100;

      const result = calculateConvergence(futurePaths, currentPrice);

      expect(result.score).toBe(1);
      expect(result.label).toBe('convergent');
    });

    test(`경로 길이가 0이면 score 1, label 'convergent'`, () => {
      const futurePaths = [[], [], []];
      const currentPrice = 100;

      const result = calculateConvergence(futurePaths, currentPrice);

      expect(result.score).toBe(1);
      expect(result.label).toBe('convergent');
    });
  });

  // ==================== calculateVolatilityContext ====================
  describe('calculateVolatilityContext', () => {
    test(`낮은 변동성 데이터는 level 'low' 반환`, () => {
      // 일일 변동 0.5% 정도 (연율화 ~8%)
      const history: OHLC[] = Array.from({ length: 50 }, (_, i) => ({
        time: 1000000 + i * 86400,
        open: 100 + i * 0.1,
        high: 101 + i * 0.1,
        low: 99 + i * 0.1,
        close: 100 + i * 0.1 + Math.sin(i) * 0.5,
        volume: 1000000,
      }));

      const result = calculateVolatilityContext(history);

      expect(result.level).toBe('low');
      expect(result.annualizedVolatility).toBeLessThan(0.15);
      expect(result.message).toContain('낮은 수준');
      expect(result.dailyReturnStd).toBeGreaterThan(0);
    });

    test(`높은 변동성 데이터는 level 'high' 또는 'very_high' 반환`, () => {
      // 일일 변동 3% 정도 (연율화 ~48%)
      const history: OHLC[] = Array.from({ length: 50 }, (_, i) => ({
        time: 1000000 + i * 86400,
        open: 100,
        high: 105,
        low: 95,
        close: 100 + Math.sin(i) * 3,
        volume: 1000000,
      }));

      const result = calculateVolatilityContext(history);

      expect(['high', 'very_high']).toContain(result.level);
      expect(result.annualizedVolatility).toBeGreaterThan(0.3);
      expect(result.message).toContain('높은 수준');
    });

    test(`데이터가 부족하면 level 'low'와 안내 메시지 반환`, () => {
      const history: OHLC[] = [{
        time: 1000000,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000000,
      }];

      const result = calculateVolatilityContext(history);

      expect(result.level).toBe('low');
      expect(result.annualizedVolatility).toBe(0);
      expect(result.dailyReturnStd).toBe(0);
      expect(result.message).toContain('데이터가 부족');
    });

    test(`연율화 변동성이 올바르게 계산됨`, () => {
      // 간단한 테스트 데이터
      const history: OHLC[] = [
        { time: 1000000, open: 100, high: 105, low: 95, close: 100, volume: 1000000 },
        { time: 1086400, open: 100, high: 105, low: 95, close: 102, volume: 1000000 },
        { time: 1172800, open: 102, high: 107, low: 97, close: 98, volume: 1000000 },
      ];

      const result = calculateVolatilityContext(history);

      // 연율화 = dailyStd * sqrt(252)
      const expectedAnnualized = result.dailyReturnStd * Math.sqrt(252);
      expect(result.annualizedVolatility).toBeCloseTo(expectedAnnualized, 5);
    });
  });

  // ==================== generateNoMatchContext ====================
  describe('generateNoMatchContext', () => {
    test(`matchCount >= 3이면 null 반환`, () => {
      const result = generateNoMatchContext(3, 'low');
      expect(result).toBeNull();

      const result5 = generateNoMatchContext(5, 'high');
      expect(result5).toBeNull();
    });

    test(`matchCount = 1, low volatility는 reason 'insufficient_data'`, () => {
      const result = generateNoMatchContext(1, 'low');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('insufficient_data');
      expect(result?.message).toContain('1개만 찾았습니다');
      expect(result?.recentVolatility).toBe('low');
    });

    test(`matchCount = 2, medium volatility는 reason 'insufficient_data'`, () => {
      const result = generateNoMatchContext(2, 'medium');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('insufficient_data');
      expect(result?.message).toContain('2개만 찾았습니다');
    });

    test(`matchCount = 0, high volatility는 reason 'unprecedented'`, () => {
      const result = generateNoMatchContext(0, 'high');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('unprecedented');
      expect(result?.message).toContain('유례가 없는 패턴');
      expect(result?.recentVolatility).toBe('high');
    });

    test(`matchCount = 0, very_high volatility는 reason 'unprecedented'`, () => {
      const result = generateNoMatchContext(0, 'very_high');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('unprecedented');
      expect(result?.message).toContain('유례가 없는 패턴');
    });

    test(`matchCount = 0, low volatility는 reason 'no_pattern'`, () => {
      const result = generateNoMatchContext(0, 'low');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('no_pattern');
      expect(result?.message).toContain('충분한 과거 패턴을 찾지 못했습니다');
      expect(result?.recentVolatility).toBe('low');
    });

    test(`matchCount = 0, medium volatility는 reason 'no_pattern'`, () => {
      const result = generateNoMatchContext(0, 'medium');

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('no_pattern');
    });
  });
});
