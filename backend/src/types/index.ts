export interface OHLC {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface PredictionMatch {
    correlation: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    priceCorrelation?: number;
    volumeCorrelation?: number;
    weight?: number;
    opacity?: number;  // 시각화용 투명도 (0.1 ~ 1.0)
    rank?: number;     // 순위 (1 ~ 10)
    // Phase 3: DTW 관련 필드
    dtwSimilarity?: number;  // DTW 유사도 (0~1)
    timeWarp?: number;       // 시간 왜곡 정도 (일 단위)
    // Phase 2-1: 패턴 유형 분류
    patternType?: PatternClassification;
    // Phase 3-2: 시뮬레이션 수익률
    simulatedReturn?: number;  // 해당 패턴의 실제 역사적 수익률 (비정규화)
}

export type DivergenceType = "Bullish" | "Bearish" | "None";

export interface IntegratedAnalysis {
    rsi_value: number;
    status: '과매수' | '과매도' | '중립';
    divergence_type: DivergenceType;
    confidence_score: number;
    comment: string;
}

export interface PredictionResult {
    history: OHLC[];
    matches: PredictionMatch[];
    scenario: number[];
    confidenceUpper: number[];
    confidenceLower: number[];
    confidence68Upper: number[];
    confidence68Lower: number[];
    confidence95Upper: number[];
    confidence95Lower: number[];
    integratedAnalysis?: IntegratedAnalysis;
    // Phase 1-2: 매칭 부족 여부
    insufficient?: boolean;
    // Phase 1-3: 종목별 변동성 컨텍스트
    volatilityContext?: VolatilityContext;
    // Phase 2-2: 시나리오 수렴도
    convergenceScore?: number;              // 0~1, 1=완전 수렴
    convergenceLabel?: 'convergent' | 'divergent' | 'neutral';
    // Phase 2-3: 매칭 실패 컨텍스트
    noMatchContext?: NoMatchContext;
}

// Phase 2: 다중 시간 프레임 분석용 타입
export interface TimeframeAnalysis {
    windowSize: number;
    predictionSize: number;
    matches: PredictionMatch[];
    scenario: number[];
    confidence68Upper: number[];
    confidence68Lower: number[];
    confidence95Upper: number[];
    confidence95Lower: number[];
}

export interface MultiTimeframeResult {
    short: TimeframeAnalysis;   // 7일 → 5일 예측
    medium: TimeframeAnalysis;  // 15일 → 10일 예측
    long: TimeframeAnalysis;    // 30일 → 15일 예측
    combined: PredictionResult; // 가중 평균 결과
    confidence: 'A' | 'B' | 'C'; // 신뢰도 등급
}

// Phase 3: ATR 설정 인터페이스
export interface ATRConfig {
    period: number;    // ATR 계산 기간 (기본 14일)
    enabled: boolean;  // ATR 정규화 사용 여부
}

// Phase 3: 고급 분석 옵션
export interface AdvancedAnalysisOptions {
    useDTW: boolean;     // DTW 사용 여부
    useATR: boolean;     // ATR 정규화 사용 여부
    dtwWeight: number;   // DTW 가중치 (기본 0.3)
    atrPeriod: number;   // ATR 기간 (기본 14)
}

// ==================== 백테스팅 타입 ====================

// 백테스트 분석 모드
export type BacktestMode = 'basic' | 'multiTimeframe' | 'advanced';

// 백테스트 실행 설정 (내부용)
export interface BacktestConfig {
    mode: BacktestMode;
    step: number;              // 테스트 간격 (거래일, 기본 5)
    startIndex: number;        // 시작 인덱스 (from 날짜에서 변환)
    endIndex: number;          // 종료 인덱스 (to 날짜에서 변환)
    advancedOptions?: Partial<AdvancedAnalysisOptions>;
}

// 개별 테스트 포인트 결과
export interface BacktestPointMetrics {
    date: string;              // YYYY-MM-DD
    timestamp: number;
    currentPrice: number;      // 테스트 시점 종가
    matchCount: number;        // 엔진이 찾은 매칭 수
    predicted: number[];       // 예측 시나리오
    actual: number[];          // 실제 미래 가격
    rmsePercent: number;       // RMSE (현재가 대비 %)
    maePercent: number;        // MAE (현재가 대비 %)
    directionCorrect: boolean; // 방향 예측 정확 여부
    coverage68: number;        // 68% 신뢰구간 커버율 (0~1)
    coverage95: number;        // 95% 신뢰구간 커버율 (0~1)
    confidenceGrade?: 'A' | 'B' | 'C';  // multiTimeframe 전용
}

// 종합 통계
export interface BacktestAggregateMetrics {
    totalTestPoints: number;
    testPointsWithMatches: number;
    avgRmsePercent: number;
    avgMaePercent: number;
    directionalAccuracy: number;  // 0~100%
    avgCoverage68: number;        // 0~1
    avgCoverage95: number;        // 0~1
    avgMatchCount: number;
}

// API 응답
export interface BacktestResult {
    symbol: string;
    mode: BacktestMode;
    dateRange: string;         // "2025-01-15 ~ 2025-12-31"
    step: number;
    elapsedMs: number;
    aggregate: BacktestAggregateMetrics;
    points: BacktestPointMetrics[];
}

// ==================== 로드맵 Phase 1&2 타입 ====================

// Phase 2-1: 패턴 유형 분류
export type PatternType = 'surge_pullback' | 'v_rebound' | 'steady_rise' | 'sideways' | 'sharp_decline' | 'unknown';

// Phase 2-1: 패턴 분류 결과
export interface PatternClassification {
    type: PatternType;
    label: string;        // 한국어 라벨 (e.g., "급등 후 조정")
    description: string;  // 간단한 설명
}

// Phase 1-3: 변동성 등급
export type VolatilityLevel = 'low' | 'medium' | 'high' | 'very_high';

// Phase 1-3: 변동성 컨텍스트
export interface VolatilityContext {
    dailyReturnStd: number;         // 최근 30일 일일 수익률 표준편차
    annualizedVolatility: number;   // 연환산 변동성
    level: VolatilityLevel;         // 등급
    message: string;                // 사용자 메시지 (e.g., "이 종목의 변동성은 높은 수준입니다")
}

// Phase 2-3: 매칭 실패 컨텍스트
export interface NoMatchContext {
    reason: 'no_pattern' | 'insufficient_data' | 'unprecedented';
    message: string;                // 사용자 메시지
    recentVolatility: VolatilityLevel;
}
