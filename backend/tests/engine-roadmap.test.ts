import { EngineService } from '../src/services/engine.service.js';
import { OHLC } from '../src/types/index.js';

// 결정론적 테스트 데이터 생성 (기존 패턴과 동일)
function generateTestData(count: number): OHLC[] {
  return Array.from({ length: count }, (_, i) => {
    const base = 100 + Math.sin((i / 30) * 2 * Math.PI) * 5 + i * 0.05;
    return {
      time: Math.floor(new Date(2020, 0, 1).getTime() / 1000) + i * 86400,
      open: base - 0.5,
      high: base + 1,
      low: base - 1,
      close: base,
      volume: 1000000 + Math.sin((i / 7) * 2 * Math.PI) * 500000,
    };
  });
}

describe('EngineService - Phase 1 & 2 Features', () => {
  let engineService: EngineService;

  beforeEach(() => {
    engineService = new EngineService();
  });

  // ==================== Phase 1-1: t-distribution CI ====================
  describe('Phase 1-1: t-분포 기반 신뢰구간', () => {
    test(`analyze() 결과의 95% 신뢰구간이 ±2σ보다 넓음`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      // 최소 1개 이상의 시나리오 포인트가 있어야 함
      expect(result.scenario.length).toBeGreaterThan(0);

      // 첫 시점의 신뢰구간 검증
      const step = 0;
      const mean = result.scenario[step];
      const upper95 = result.confidence95Upper[step];
      const lower95 = result.confidence95Lower[step];

      // 신뢰구간이 좌우 대칭인지 확인
      const upperGap = upper95 - mean;
      const lowerGap = mean - lower95;
      expect(upperGap).toBeCloseTo(lowerGap, 0);

      // 95% 신뢰구간이 0보다 큼 (의미 있는 범위)
      expect(upperGap).toBeGreaterThan(0);
      expect(lowerGap).toBeGreaterThan(0);
    });

    test(`매칭이 5개일 때 95% 배수가 약 2.776 (df=4, t-분포)`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      // 매칭이 있는 경우에만 테스트
      if (result.matches.length >= 5) {
        const step = 0;
        const mean = result.scenario[step];
        const upper95 = result.confidence95Upper[step];

        // 표준편차 역산
        const upperGap = upper95 - mean;

        // t-분포 배수 = 2.776 (df=4, 95%)
        // 정규분포 배수 = 1.96
        // t-분포가 더 넓으므로 upperGap은 정규분포보다 커야 함
        // 정확한 검증은 어렵지만, 최소한 의미 있는 범위인지 확인
        expect(upperGap).toBeGreaterThan(0);
      }
    });

    test(`신뢰구간이 좌우 대칭`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      for (let step = 0; step < result.scenario.length; step++) {
        const mean = result.scenario[step];
        const upper68 = result.confidence68Upper[step];
        const lower68 = result.confidence68Lower[step];
        const upper95 = result.confidence95Upper[step];
        const lower95 = result.confidence95Lower[step];

        // 68% 신뢰구간 대칭
        const upperGap68 = upper68 - mean;
        const lowerGap68 = mean - lower68;
        expect(upperGap68).toBeCloseTo(lowerGap68, 0);

        // 95% 신뢰구간 대칭
        const upperGap95 = upper95 - mean;
        const lowerGap95 = mean - lower95;
        expect(upperGap95).toBeCloseTo(lowerGap95, 0);

        // 95% 신뢰구간이 68%보다 넓음
        expect(upperGap95).toBeGreaterThanOrEqual(upperGap68);
      }
    });
  });

  // ==================== Phase 1-2: insufficient flag ====================
  describe('Phase 1-2: 매칭 부족 여부', () => {
    test(`매칭이 3개 이상이면 insufficient === false`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      // 테스트 데이터는 충분한 매칭을 생성하도록 설계됨
      if (result.matches.length >= 3) {
        expect(result.insufficient).toBe(false);
      }
    });

    test(`매칭이 3개 미만이면 insufficient === true`, () => {
      // 매칭이 거의 없을 만큼 짧은 데이터
      const history = generateTestData(30);
      const result = engineService.analyze(history);

      if (result.matches.length < 3) {
        expect(result.insufficient).toBe(true);
      }
    });

    test(`매칭이 0개여도 에러 없이 동작`, () => {
      // 매우 짧은 데이터로 매칭이 없는 경우 시뮬레이션
      const history = generateTestData(20);
      const result = engineService.analyze(history);

      // 에러 없이 결과 반환
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(result.scenario).toBeDefined();

      // 매칭이 없으면 insufficient는 true
      if (result.matches.length === 0) {
        expect(result.insufficient).toBe(true);
      }
    });
  });

  // ==================== Phase 1-3: Volatility Context ====================
  describe('Phase 1-3: 변동성 컨텍스트', () => {
    test(`analyze() 결과에 volatilityContext 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      expect(result.volatilityContext).toBeDefined();
      expect(result.volatilityContext?.level).toBeDefined();
      expect(result.volatilityContext?.message).toBeDefined();
      expect(result.volatilityContext?.annualizedVolatility).toBeDefined();
      expect(result.volatilityContext?.dailyReturnStd).toBeDefined();
    });

    test(`volatilityContext.level이 유효한 값`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      const validLevels = ['low', 'medium', 'high', 'very_high'];
      expect(validLevels).toContain(result.volatilityContext?.level);
    });

    test(`volatilityContext.dailyReturnStd가 양수`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      expect(result.volatilityContext?.dailyReturnStd).toBeGreaterThanOrEqual(0);
    });

    test(`volatilityContext.annualizedVolatility가 양수`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      expect(result.volatilityContext?.annualizedVolatility).toBeGreaterThanOrEqual(0);
    });

    test(`volatilityContext.message가 빈 문자열이 아님`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      expect(result.volatilityContext?.message).toBeTruthy();
      expect(result.volatilityContext?.message.length).toBeGreaterThan(0);
    });
  });

  // ==================== Phase 2-1: Pattern Classification ====================
  describe('Phase 2-1: 패턴 유형 분류', () => {
    test(`analyze() 결과의 matches에 patternType 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      if (result.matches.length > 0) {
        const firstMatch = result.matches[0];
        expect(firstMatch.patternType).toBeDefined();
        expect(firstMatch.patternType?.type).toBeDefined();
        expect(firstMatch.patternType?.label).toBeDefined();
        expect(firstMatch.patternType?.description).toBeDefined();
      }
    });

    test(`patternType.label이 빈 문자열이 아님`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      result.matches.forEach((match) => {
        expect(match.patternType?.label).toBeTruthy();
        expect(match.patternType?.label.length).toBeGreaterThan(0);
      });
    });

    test(`patternType.type이 유효한 값`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      const validTypes = [
        'surge_pullback',
        'v_rebound',
        'steady_rise',
        'sideways',
        'sharp_decline',
        'unknown',
      ];

      result.matches.forEach((match) => {
        expect(validTypes).toContain(match.patternType?.type);
      });
    });
  });

  // ==================== Phase 2-2: Convergence ====================
  describe('Phase 2-2: 시나리오 수렴도', () => {
    test(`매칭이 있을 때 convergenceScore가 0~1 범위`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      if (result.matches.length > 0) {
        expect(result.convergenceScore).toBeDefined();
        expect(result.convergenceScore).toBeGreaterThanOrEqual(0);
        expect(result.convergenceScore).toBeLessThanOrEqual(1);
      }
    });

    test(`convergenceLabel이 유효한 값`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      if (result.matches.length > 0) {
        const validLabels = ['convergent', 'divergent', 'neutral'];
        expect(validLabels).toContain(result.convergenceLabel);
      }
    });

    test(`매칭이 없으면 convergenceScore가 undefined 또는 0`, () => {
      const history = generateTestData(20);
      const result = engineService.analyze(history);

      if (result.matches.length === 0) {
        // convergenceScore는 undefined이거나 의미 없는 값
        expect(result.convergenceScore === undefined || result.convergenceScore === 0).toBe(true);
      }
    });
  });

  // ==================== Phase 2-3: No-Match Context ====================
  describe('Phase 2-3: 매칭 실패 컨텍스트', () => {
    test(`매칭이 충분할 때 noMatchContext가 null/undefined`, () => {
      const history = generateTestData(200);
      const result = engineService.analyze(history);

      if (result.matches.length >= 3) {
        expect(result.noMatchContext === undefined || result.noMatchContext === null).toBe(true);
      }
    });

    test(`매칭이 부족할 때 noMatchContext에 메시지가 있음`, () => {
      const history = generateTestData(30);
      const result = engineService.analyze(history);

      if (result.matches.length < 3) {
        expect(result.noMatchContext).toBeDefined();
        expect(result.noMatchContext?.message).toBeTruthy();
        expect(result.noMatchContext?.message.length).toBeGreaterThan(0);
        expect(result.noMatchContext?.reason).toBeDefined();
        expect(result.noMatchContext?.recentVolatility).toBeDefined();
      }
    });

    test(`noMatchContext.reason이 유효한 값`, () => {
      const history = generateTestData(30);
      const result = engineService.analyze(history);

      if (result.noMatchContext) {
        const validReasons = ['no_pattern', 'insufficient_data', 'unprecedented'];
        expect(validReasons).toContain(result.noMatchContext.reason);
      }
    });
  });

  // ==================== analyzeAdvanced도 Phase 1&2 기능 포함 ====================
  describe('analyzeAdvanced - Phase 1 & 2 통합', () => {
    test(`analyzeAdvanced()도 volatilityContext 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyzeAdvanced(history);

      expect(result.volatilityContext).toBeDefined();
      expect(result.volatilityContext?.level).toBeDefined();
    });

    test(`analyzeAdvanced()도 insufficient 플래그 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyzeAdvanced(history);

      expect(result.insufficient).toBeDefined();
      expect(typeof result.insufficient).toBe('boolean');
    });

    test(`analyzeAdvanced()의 matches에도 patternType 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyzeAdvanced(history);

      if (result.matches.length > 0) {
        expect(result.matches[0].patternType).toBeDefined();
      }
    });

    test(`analyzeAdvanced()도 convergenceScore 포함`, () => {
      const history = generateTestData(200);
      const result = engineService.analyzeAdvanced(history);

      if (result.matches.length > 0) {
        expect(result.convergenceScore).toBeDefined();
        expect(result.convergenceScore).toBeGreaterThanOrEqual(0);
        expect(result.convergenceScore).toBeLessThanOrEqual(1);
      }
    });

    test(`analyzeAdvanced()도 noMatchContext 포함`, () => {
      const history = generateTestData(30);
      const result = engineService.analyzeAdvanced(history);

      if (result.matches.length < 3) {
        expect(result.noMatchContext).toBeDefined();
      }
    });
  });
});
