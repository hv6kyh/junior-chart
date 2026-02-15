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
    priceCorrelation: number;
    volumeCorrelation: number;
    weight: number;
    opacity: number;
    rank: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    dtwSimilarity?: number;
    timeWarp?: number;
    patternType?: PatternClassification;
    simulatedReturn?: number;
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
    insufficient?: boolean;
    volatilityContext?: VolatilityContext;
    convergenceScore?: number;
    convergenceLabel?: 'convergent' | 'divergent' | 'neutral';
    noMatchContext?: NoMatchContext;
}

export interface MultiTimeframeResult {
    short: TimeframeAnalysis;
    medium: TimeframeAnalysis;
    long: TimeframeAnalysis;
    combined: PredictionResult;
    confidence: 'A' | 'B' | 'C';
}

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

// Phase 2-1: 패턴 유형 분류
export type PatternType = 'surge_pullback' | 'v_rebound' | 'steady_rise' | 'sideways' | 'sharp_decline' | 'unknown';

export interface PatternClassification {
    type: PatternType;
    label: string;
    description: string;
}

// Phase 1-3: 변동성 등급
export type VolatilityLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface VolatilityContext {
    dailyReturnStd: number;
    annualizedVolatility: number;
    level: VolatilityLevel;
    message: string;
}

// Phase 2-3: 매칭 실패 컨텍스트
export interface NoMatchContext {
    reason: 'no_pattern' | 'insufficient_data' | 'unprecedented';
    message: string;
    recentVolatility: VolatilityLevel;
}

// Phase 3: ATR 설정
export interface ATRConfig {
    period: number;
    enabled: boolean;
}

// Phase 3: 고급 분석 옵션
export interface AdvancedAnalysisOptions {
    useDTW: boolean;
    useATR: boolean;
    dtwWeight: number;
    atrPeriod: number;
}


