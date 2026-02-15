import type {
  OHLC,
  PatternClassification,
  VolatilityContext,
  VolatilityLevel,
  NoMatchContext,
} from '../types/index.js';

/**
 * t-분포 임계값 조회 (양측 검정)
 * 소표본(n < 30)에서 정규분포 대신 t-분포를 사용하여 더 넓은 신뢰구간을 생성한다.
 *
 * @param df - degrees of freedom (= sample count - 1)
 * @param confidence - '68' or '95'
 * @returns multiplier for standard deviation
 */
export function getTMultiplier(df: number, confidence: '68' | '95'): number {
  // t-분포 임계값 테이블 (양측 검정)
  const tTable95: Record<number, number> = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    15: 2.131,
    20: 2.086,
    30: 2.042,
  };

  const tTable68: Record<number, number> = {
    1: 1.84,
    2: 1.32,
    3: 1.25,
    4: 1.19,
    5: 1.16,
    6: 1.13,
    7: 1.12,
    8: 1.11,
    9: 1.1,
    10: 1.09,
    15: 1.07,
    20: 1.06,
    30: 1.04,
  };

  const table = confidence === '95' ? tTable95 : tTable68;
  const normalValue = confidence === '95' ? 1.96 : 1.0;

  // df < 1인 경우 df=1 값 반환
  if (df < 1) {
    return table[1];
  }

  // df >= 30인 경우 정규분포 값 반환
  if (df >= 30) {
    return normalValue;
  }

  // 테이블에 정확히 있는 경우
  if (table[df] !== undefined) {
    return table[df];
  }

  // 선형 보간
  const dfKeys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  let lowerDf = dfKeys[0];
  let upperDf = dfKeys[dfKeys.length - 1];

  for (let i = 0; i < dfKeys.length - 1; i++) {
    if (df >= dfKeys[i] && df <= dfKeys[i + 1]) {
      lowerDf = dfKeys[i];
      upperDf = dfKeys[i + 1];
      break;
    }
  }

  const lowerValue = table[lowerDf];
  const upperValue = table[upperDf];
  const ratio = (df - lowerDf) / (upperDf - lowerDf);

  return lowerValue + ratio * (upperValue - lowerValue);
}

/**
 * 가격 윈도우의 변화율 패턴을 분석하여 유형을 분류한다.
 * @param prices - 윈도우 내 종가 배열 (최소 5개)
 * @returns PatternClassification
 */
export function classifyPattern(prices: number[]): PatternClassification {
  if (prices.length < 5) {
    return {
      type: 'unknown',
      label: '복합 패턴',
      description: '뚜렷한 유형으로 분류하기 어려운 패턴',
    };
  }

  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const midIndex = Math.floor(prices.length / 2);
  const midPrice = prices[midIndex];

  // 변화율 계산
  const firstHalfReturn = (midPrice - startPrice) / startPrice;
  const secondHalfReturn = (endPrice - midPrice) / midPrice;
  const totalReturn = (endPrice - startPrice) / startPrice;

  // 최대 하락/상승 계산
  let maxPrice = prices[0];
  let minPrice = prices[0];
  let minIndex = 0;

  for (let i = 0; i < prices.length; i++) {
    if (prices[i] > maxPrice) maxPrice = prices[i];
    if (prices[i] < minPrice) {
      minPrice = prices[i];
      minIndex = i;
    }
  }

  const maxDrawdown = (minPrice - startPrice) / startPrice;
  const rangePercent = (maxPrice - minPrice) / startPrice;

  // 패턴 분류 (우선순위 순서대로 검사)
  // 1. surge_pullback (급등 후 조정)
  if (firstHalfReturn > 0.03 && secondHalfReturn < -0.01) {
    return {
      type: 'surge_pullback',
      label: '급등 후 조정',
      description: '상승 에너지 후 일부 되돌림 패턴',
    };
  }

  // 2. v_rebound (V자 반등)
  const middleThirdStart = Math.floor(prices.length / 3);
  const middleThirdEnd = Math.floor((prices.length * 2) / 3);
  const isMinInMiddleThird = minIndex >= middleThirdStart && minIndex <= middleThirdEnd;

  if (maxDrawdown < -0.03 && isMinInMiddleThird && endPrice > startPrice) {
    return {
      type: 'v_rebound',
      label: 'V자 반등',
      description: '하락 후 빠른 회복 패턴',
    };
  }

  // 3. sharp_decline (급락)
  if (totalReturn < -0.05) {
    return {
      type: 'sharp_decline',
      label: '급락',
      description: '지속적인 하락 추세',
    };
  }

  // 4. steady_rise (완만한 상승)
  if (totalReturn > 0.03 && rangePercent < totalReturn * 2) {
    return {
      type: 'steady_rise',
      label: '완만한 상승',
      description: '꾸준한 우상향 추세',
    };
  }

  // 5. sideways (횡보 박스권)
  if (Math.abs(totalReturn) < 0.02 && rangePercent < 0.05) {
    return {
      type: 'sideways',
      label: '횡보 박스권',
      description: '좁은 범위 내 등락 반복',
    };
  }

  // 6. unknown (기타)
  return {
    type: 'unknown',
    label: '복합 패턴',
    description: '뚜렷한 유형으로 분류하기 어려운 패턴',
  };
}

/**
 * 매칭된 미래 시나리오들의 수렴도를 계산한다.
 * 모든 시나리오가 비슷한 방향이면 수렴(1에 가까움), 제각각이면 발산(0에 가까움).
 *
 * @param futurePaths - 각 매칭의 미래 가격 배열들 (이미 현재가 기준으로 정규화됨)
 * @param currentPrice - 현재 가격
 * @returns { score: number (0~1), label: 'convergent' | 'divergent' | 'neutral' }
 */
export function calculateConvergence(
  futurePaths: number[][],
  currentPrice: number
): { score: number; label: 'convergent' | 'divergent' | 'neutral' } {
  // 경로가 2개 미만이면 수렴으로 간주
  if (futurePaths.length < 2) {
    return { score: 1, label: 'convergent' };
  }

  // 최소 경로 길이 찾기
  const minLength = Math.min(...futurePaths.map((p) => p.length));
  if (minLength === 0) {
    return { score: 1, label: 'convergent' };
  }

  // 각 시점별 변동계수(CV) 계산
  const cvs: number[] = [];

  for (let t = 0; t < minLength; t++) {
    const values = futurePaths.map((path) => path[t]);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 변동계수 = 표준편차 / 평균
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    cvs.push(cv);
  }

  // 평균 CV 계산
  const avgCV = cvs.reduce((sum, cv) => sum + cv, 0) / cvs.length;

  // 점수 변환 (0~1 범위로 매핑)
  const score = 1 / (1 + avgCV * 10);

  // 라벨 결정
  let label: 'convergent' | 'divergent' | 'neutral';
  if (score >= 0.7) {
    label = 'convergent';
  } else if (score <= 0.3) {
    label = 'divergent';
  } else {
    label = 'neutral';
  }

  return { score, label };
}

/**
 * 종목의 최근 변동성 컨텍스트를 계산한다.
 * @param history - OHLC 데이터 (최소 30개)
 * @param period - 계산 기간 (기본 30)
 */
export function calculateVolatilityContext(
  history: OHLC[],
  period: number = 30
): VolatilityContext {
  const dataPoints = history.slice(-period);

  if (dataPoints.length < 2) {
    return {
      annualizedVolatility: 0,
      dailyReturnStd: 0,
      level: 'low',
      message: '데이터가 부족하여 변동성을 계산할 수 없습니다.',
    };
  }

  // 일별 수익률 계산
  const returns: number[] = [];
  for (let i = 1; i < dataPoints.length; i++) {
    const dailyReturn =
      (dataPoints[i].close - dataPoints[i - 1].close) / dataPoints[i - 1].close;
    returns.push(dailyReturn);
  }

  // 표준편차 계산
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyReturnStd = Math.sqrt(variance);

  // 연율화 변동성 (252 거래일 가정)
  const annualizedVolatility = dailyReturnStd * Math.sqrt(252);

  // 변동성 등급 및 메시지 결정
  let level: VolatilityLevel;
  let message: string;

  if (annualizedVolatility < 0.15) {
    level = 'low';
    message = '이 종목의 변동성은 낮은 수준입니다. 비교적 안정적인 가격 흐름을 보입니다.';
  } else if (annualizedVolatility < 0.3) {
    level = 'medium';
    message = '이 종목의 변동성은 보통 수준입니다.';
  } else if (annualizedVolatility < 0.5) {
    level = 'high';
    message = '이 종목의 변동성은 높은 수준입니다. 예측 오차가 클 수 있습니다.';
  } else {
    level = 'very_high';
    message = '이 종목의 변동성은 매우 높은 수준입니다. 예측의 불확실성이 큽니다.';
  }

  return {
    annualizedVolatility,
    dailyReturnStd,
    level,
    message,
  };
}

/**
 * 매칭 실패 시 컨텍스트 메시지를 생성한다.
 * @param matchCount - 찾은 매칭 수
 * @param recentVolatility - 최근 변동성 등급
 */
export function generateNoMatchContext(
  matchCount: number,
  recentVolatility: VolatilityLevel
): NoMatchContext | null {
  // 충분한 매칭이 있으면 null 반환
  if (matchCount >= 3) {
    return null;
  }

  // 매칭이 1~2개인 경우
  if (matchCount > 0) {
    return {
      reason: 'insufficient_data',
      message: `유사 패턴을 ${matchCount}개만 찾았습니다. 충분한 과거 사례가 없어 예측 신뢰도가 낮습니다.`,
      recentVolatility,
    };
  }

  // 매칭이 0개인 경우
  if (recentVolatility === 'high' || recentVolatility === 'very_high') {
    return {
      reason: 'unprecedented',
      message:
        '최근 움직임은 과거 5년간 유례가 없는 패턴입니다. 전례 없는 급변동 구간일 수 있습니다.',
      recentVolatility,
    };
  } else {
    return {
      reason: 'no_pattern',
      message: '충분한 과거 패턴을 찾지 못했습니다. 독특한 움직임으로 참고할 사례가 없습니다.',
      recentVolatility,
    };
  }
}
