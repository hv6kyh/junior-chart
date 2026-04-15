import { Router } from 'express';
import YahooFinance from 'yahoo-finance2';
import { EngineService } from '../services/engine.service.js';
import { OHLC } from '../types/index.js';

const router = Router();
const yahooFinance = new (YahooFinance as any)();
const engine = new EngineService();

const getStartDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split('T')[0];
};

const PATTERN_LABELS: Record<string, string> = {
  surge_pullback: '급등 후 조정',
  v_rebound: 'V자 반등',
  steady_rise: '완만한 상승',
  sideways: '횡보',
  sharp_decline: '급락',
  unknown: '패턴 불명확',
};

const PATTERN_INTERPRETATIONS: Record<string, (dir: 'up' | 'down' | 'neutral') => string> = {
  surge_pullback: () => '단기 급등 후 조정 국면. 추가 하락 또는 재반등 가능성에 주목하세요.',
  v_rebound: (dir) =>
    dir === 'up' ? '저점에서 강한 반등 패턴이 포착됐습니다.' : '반등 후 재하락 가능성이 있습니다.',
  steady_rise: () => '꾸준한 상승 흐름이 이어지고 있습니다.',
  sideways: () => '뚜렷한 방향성 없이 횡보 중입니다. 돌파 방향을 확인 후 판단하세요.',
  sharp_decline: () => '단기 급락 구간입니다. 저점 확인이 선행되어야 합니다.',
  unknown: () => '과거 사례 기반으로 뚜렷한 패턴이 감지되지 않았습니다.',
};

interface BriefItem {
  code: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  isUp: boolean;
  patternLabel: string;
  confidence: number;
  interpretation: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface MarketSummary {
  kospi: { value: number; change: number; isUp: boolean } | null;
  kosdaq: { value: number; change: number; isUp: boolean } | null;
}

async function fetchBriefForSymbol(
  symbol: string,
  name: string,
): Promise<BriefItem | null> {
  try {
    const queryOptions = { period1: getStartDate(), interval: '1d' };
    const result = await (yahooFinance as any).chart(symbol, queryOptions);

    if (!result?.quotes?.length) return null;

    const formattedData: OHLC[] = result.quotes
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume || 0,
      }))
      .filter((d: any) => d.open !== null && d.close !== null);

    if (formattedData.length < 20) return null;

    const analysis = engine.analyze(formattedData);
    const history = analysis.history;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    const currentPrice = last.close;
    const changePercent = prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
    const isUp = changePercent >= 0;

    // Pick dominant pattern from top matches
    const topMatch = analysis.matches[0];
    const patternType = topMatch?.patternType?.type ?? 'unknown';
    const patternLabel = PATTERN_LABELS[patternType] ?? '패턴 불명확';

    // Confidence from correlation of top match (0~1 → %)
    const confidence = topMatch ? Math.round(topMatch.correlation * 100) : 0;

    // Direction based on scenario median
    const scenario = analysis.scenario;
    let dir: 'up' | 'down' | 'neutral' = 'neutral';
    if (scenario.length > 0) {
      const lastScenario = scenario[scenario.length - 1];
      if (lastScenario > currentPrice * 1.005) dir = 'up';
      else if (lastScenario < currentPrice * 0.995) dir = 'down';
    }

    const interpretation = (PATTERN_INTERPRETATIONS[patternType] ?? PATTERN_INTERPRETATIONS['unknown'])(dir);

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (dir === 'up' && confidence >= 60) sentiment = 'positive';
    else if (dir === 'down' && confidence >= 60) sentiment = 'negative';

    return { code: symbol, name, currentPrice, changePercent, isUp, patternLabel, confidence, interpretation, sentiment };
  } catch {
    return null;
  }
}

async function fetchMarketSummary(): Promise<MarketSummary> {
  const summary: MarketSummary = { kospi: null, kosdaq: null };
  try {
    const quotes = await (yahooFinance as any).quote(['^KS11', '^KQ11']);
    const arr = Array.isArray(quotes) ? quotes : [quotes];
    for (const q of arr) {
      const entry = {
        value: q.regularMarketPrice ?? 0,
        change: q.regularMarketChangePercent ?? 0,
        isUp: (q.regularMarketChange ?? 0) >= 0,
      };
      if (q.symbol === '^KS11') summary.kospi = entry;
      else if (q.symbol === '^KQ11') summary.kosdaq = entry;
    }
  } catch {
    // market data is best-effort
  }
  return summary;
}

// GET /api/daily-brief?symbols=000660.KS,MSFT&names=SK하이닉스,마이크로소프트
router.get('/', async (req, res) => {
  const symbolsParam = (req.query.symbols as string) || '';
  const namesParam = (req.query.names as string) || '';

  const DEFAULT_SYMBOLS = ['000660.KS', 'MSFT', 'CRM', 'COIN'];
  const DEFAULT_NAMES = ['SK하이닉스', '마이크로소프트', '세일즈포스', '코인베이스'];

  const symbols = symbolsParam ? symbolsParam.split(',').map((s) => s.trim()) : DEFAULT_SYMBOLS;
  const names = namesParam ? namesParam.split(',').map((s) => s.trim()) : DEFAULT_NAMES;

  // Pair symbols with names (fallback to code if name missing)
  const pairs = symbols.map((code, i) => ({ code, name: names[i] ?? code }));

  try {
    const [items, market] = await Promise.all([
      Promise.all(pairs.map((p) => fetchBriefForSymbol(p.code, p.name))),
      fetchMarketSummary(),
    ]);

    const filtered = items.filter(Boolean) as BriefItem[];

    res.json({
      generatedAt: new Date().toISOString(),
      market,
      items: filtered,
      disclaimer: '본 분석은 과거 데이터 기반 참고 자료이며, 투자 판단의 근거로 사용하지 마세요.',
    });
  } catch (error: any) {
    console.error('[DailyBrief] Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
