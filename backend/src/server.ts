import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';
import { EngineService } from './services/engine.service.js';
import { BacktestService } from './services/backtest.service.js';
import { OHLC, BacktestMode } from './types/index.js';
import disclosureRoutes from './routes/disclosure.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const yahooFinance = new (YahooFinance as any)();
const engine = new EngineService();
const backtestService = new BacktestService(engine);
const getStartDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split('T')[0];
};

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // 서버-투-서버 요청(origin 없음)이거나 허용 목록에 있으면 통과
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
  }),
);

app.get('/api/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  console.log(`[Backend TS] Processing request for: ${symbol}`);

  try {
    const queryOptions = {
      period1: getStartDate(),
      interval: '1d',
    };
    // Use any assertion to bypass library overload issues
    const result = await (yahooFinance as any).chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const formattedData: OHLC[] = result.quotes
      .map((quote: any) => ({
        time: Math.floor(new Date(quote.date).getTime() / 1000),
        open: quote.open!,
        high: quote.high!,
        low: quote.low!,
        close: quote.close!,
        volume: quote.volume || 0, // 거래량 추가
      }))
      .filter((d: any) => d.open !== null && d.close !== null);

    // 엔진 작동: 주가 데이터 분석 및 예측 생성
    const analysisResult = engine.analyze(formattedData);

    console.log(`[Backend TS] Analysis complete:`, {
      historyLength: analysisResult.history.length,
      scenarioLength: analysisResult.scenario.length,
      matchesCount: analysisResult.matches.length,
      firstScenarioValues: analysisResult.scenario.slice(0, 3),
    });

    res.json(analysisResult);
  } catch (error: any) {
    console.error(`[Backend TS] Error: `, error);
    res
      .status(500)
      .json({ error: 'Internal Server Error', message: error.message });
  }
});

// Phase 2: 다중 시간 프레임 분석 엔드포인트
app.get('/api/stock/:symbol/multi-timeframe', async (req, res) => {
  const { symbol } = req.params;
  console.log(`[Backend TS] Multi-timeframe analysis for: ${symbol}`);

  try {
    const queryOptions = {
      period1: getStartDate(),
      interval: '1d',
    };
    const result = await (yahooFinance as any).chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const formattedData: OHLC[] = result.quotes
      .map((quote: any) => ({
        time: Math.floor(new Date(quote.date).getTime() / 1000),
        open: quote.open!,
        high: quote.high!,
        low: quote.low!,
        close: quote.close!,
        volume: quote.volume || 0,
      }))
      .filter((d: any) => d.open !== null && d.close !== null);

    // 다중 시간 프레임 분석
    const analysisResult = engine.analyzeMultiTimeframe(formattedData);

    console.log(`[Backend TS] Multi-timeframe analysis complete:`, {
      shortMatches: analysisResult.short.matches.length,
      mediumMatches: analysisResult.medium.matches.length,
      longMatches: analysisResult.long.matches.length,
      confidence: analysisResult.confidence,
    });

    res.json(analysisResult);
  } catch (error: any) {
    console.error(`[Backend TS] Multi-timeframe Error: `, error);
    res
      .status(500)
      .json({ error: 'Internal Server Error', message: error.message });
  }
});

// Phase 3: DTW + ATR 고급 분석 엔드포인트
app.get('/api/stock/:symbol/advanced', async (req, res) => {
  const { symbol } = req.params;
  const { useDTW, useATR, dtwWeight, atrPeriod } = req.query;

  console.log(`[Backend TS] Advanced analysis for: ${symbol}`, {
    useDTW: useDTW !== 'false',
    useATR: useATR !== 'false',
  });

  try {
    const queryOptions = {
      period1: getStartDate(),
      interval: '1d',
    };
    const result = await (yahooFinance as any).chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const formattedData: OHLC[] = result.quotes
      .map((quote: any) => ({
        time: Math.floor(new Date(quote.date).getTime() / 1000),
        open: quote.open!,
        high: quote.high!,
        low: quote.low!,
        close: quote.close!,
        volume: quote.volume || 0,
      }))
      .filter((d: any) => d.open !== null && d.close !== null);

    // 고급 분석 옵션
    const options = {
      useDTW: useDTW !== 'false',
      useATR: useATR !== 'false',
      dtwWeight: dtwWeight ? parseFloat(dtwWeight as string) : 0.2,
      atrPeriod: atrPeriod ? parseInt(atrPeriod as string) : 14,
    };

    const startTime = Date.now();
    const analysisResult = engine.analyzeAdvanced(
      formattedData,
      15,
      10,
      options,
    );
    const elapsed = Date.now() - startTime;

    // DTW 통계 로깅
    const avgDTW =
      analysisResult.matches.length > 0
        ? analysisResult.matches.reduce(
            (sum, m) => sum + (m.dtwSimilarity || 0),
            0,
          ) / analysisResult.matches.length
        : 0;
    const avgTimeWarp =
      analysisResult.matches.length > 0
        ? analysisResult.matches.reduce(
            (sum, m) => sum + (m.timeWarp || 0),
            0,
          ) / analysisResult.matches.length
        : 0;

    console.log(`[Backend TS] Advanced analysis complete:`, {
      matchesCount: analysisResult.matches.length,
      avgDTWSimilarity: avgDTW.toFixed(4),
      avgTimeWarp: avgTimeWarp.toFixed(2),
      elapsedMs: elapsed,
    });

    res.json(analysisResult);
  } catch (error: any) {
    console.error(`[Backend TS] Advanced analysis Error: `, error);
    res
      .status(500)
      .json({ error: 'Internal Server Error', message: error.message });
  }
});

// Phase 4: 시세 정보 조회 엔드포인트 (사이드바용)
app.get('/api/stocks/quotes', async (req, res) => {
  const symbolsQuery = req.query.symbols as string;
  if (!symbolsQuery) {
    return res.status(400).json({ error: 'Symbols are required' });
  }

  const symbols = symbolsQuery.split(',');
  console.log(`[Backend TS] Fetching quotes for: ${symbols}`);

  try {
    // yahooFinance.quote는 단일 심볼 또는 배열을 받을 수 있음
    const quotes = await (yahooFinance as any).quote(symbols);

    // 배열이 아닌 경우 배열로 변환 (심볼이 하나인 경우 대응)
    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

    const formattedQuotes = quoteArray.map((quote: any) => ({
      code: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      isUp: quote.regularMarketChange >= 0,
    }));

    res.json(formattedQuotes);
  } catch (error: any) {
    console.error(`[Backend TS] Quote Error: `, error);
    res
      .status(500)
      .json({ error: 'Internal Server Error', message: error.message });
  }
});

// YYYY-MM-DD 문자열을 OHLC 배열의 인덱스로 변환 (이진 탐색)
function findDateIndex(data: OHLC[], dateStr: string): number {
  const target = new Date(dateStr).getTime() / 1000;
  let lo = 0;
  let hi = data.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (data[mid].time <= target) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// 백테스팅 엔드포인트
app.get('/api/stock/:symbol/backtest', async (req, res) => {
  const { symbol } = req.params;
  const {
    from,
    to,
    mode = 'basic',
    step = '5',
    useDTW,
    useATR,
    dtwWeight,
    atrPeriod,
  } = req.query;

  // 모드 검증
  const validModes: BacktestMode[] = ['basic', 'multiTimeframe', 'advanced'];
  if (!validModes.includes(mode as BacktestMode)) {
    return res.status(400).json({
      error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`,
    });
  }

  const stepNum = Math.max(1, parseInt(step as string) || 5);

  console.log(
    `[Backend TS] Backtest for: ${symbol}, mode=${mode}, step=${stepNum}`,
  );

  try {
    const queryOptions = {
      period1: getStartDate(),
      interval: '1d',
    };
    const result = await (yahooFinance as any).chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const formattedData: OHLC[] = result.quotes
      .map((quote: any) => ({
        time: Math.floor(new Date(quote.date).getTime() / 1000),
        open: quote.open!,
        high: quote.high!,
        low: quote.low!,
        close: quote.close!,
        volume: quote.volume || 0,
      }))
      .filter((d: any) => d.open !== null && d.close !== null);

    // 날짜 범위 결정
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
    const defaultTo = new Date(now);
    defaultTo.setMonth(defaultTo.getMonth() - 1);

    const fromStr = (from as string) || defaultFrom.toISOString().split('T')[0];
    const toStr = (to as string) || defaultTo.toISOString().split('T')[0];

    const startIndex = findDateIndex(formattedData, fromStr);
    const endIndex = findDateIndex(formattedData, toStr);

    if (startIndex >= endIndex) {
      return res
        .status(400)
        .json({ error: 'Invalid date range: from must be before to' });
    }

    // 테스트 포인트 수 제한
    const maxPoints = 100;
    const estimatedPoints = Math.ceil((endIndex - startIndex) / stepNum);
    if (estimatedPoints > maxPoints) {
      return res.status(400).json({
        error: `Too many test points (${estimatedPoints}). Increase step or narrow date range. Max: ${maxPoints}`,
      });
    }

    // advanced 모드 옵션
    const advancedOptions =
      mode === 'advanced'
        ? {
            useDTW: useDTW !== 'false',
            useATR: useATR !== 'false',
            dtwWeight: dtwWeight ? parseFloat(dtwWeight as string) : 0.2,
            atrPeriod: atrPeriod ? parseInt(atrPeriod as string) : 14,
          }
        : undefined;

    const backtestResult = backtestService.run(formattedData, symbol, {
      mode: mode as BacktestMode,
      step: stepNum,
      startIndex,
      endIndex,
      advancedOptions,
    });

    console.log(`[Backend TS] Backtest complete:`, {
      points: backtestResult.points.length,
      avgRMSE: backtestResult.aggregate.avgRmsePercent.toFixed(2) + '%',
      directionalAccuracy:
        backtestResult.aggregate.directionalAccuracy.toFixed(1) + '%',
      elapsedMs: backtestResult.elapsedMs,
    });

    res.json(backtestResult);
  } catch (error: any) {
    console.error(`[Backend TS] Backtest Error: `, error);
    res
      .status(500)
      .json({ error: 'Internal Server Error', message: error.message });
  }
});

app.use('/api/disclosures', disclosureRoutes);

app.listen(PORT, () => {
  console.log(`[Junior Chart Backend] Running at http://localhost:${PORT}`);
});
