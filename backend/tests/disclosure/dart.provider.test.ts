// backend/tests/disclosure/dart.provider.test.ts
import { DartProvider } from '../../src/services/disclosure/providers/dart.provider.js';
import type { RawDisclosure } from '../../src/services/disclosure/types.js';

describe('DartProvider', () => {
  let provider: DartProvider;

  beforeEach(() => {
    provider = new DartProvider('test-api-key');
  });

  describe('classifyType', () => {
    const makeRaw = (title: string): RawDisclosure => ({
      sourceId: 'test-001',
      corpCode: '00126380',
      corpName: '삼성전자',
      stockCode: '005930',
      market: null,
      title,
      disclosedAt: '2026-03-24',
      sourceUrl: 'https://dart.fss.or.kr/test',
      rawType: 'B001',
    });

    test('자기주식취득결정 → treasury_stock_acquire', () => {
      expect(provider.classifyType(makeRaw('자기주식취득결정'))).toBe('treasury_stock_acquire');
    });

    test('자기주식처분결정 → treasury_stock_dispose', () => {
      expect(provider.classifyType(makeRaw('자기주식처분결정'))).toBe('treasury_stock_dispose');
    });

    test('유상증자결정 → capital_increase', () => {
      expect(provider.classifyType(makeRaw('유상증자결정(주주배정)'))).toBe('capital_increase');
    });

    test('전환사채권발행결정 → convertible_bond', () => {
      expect(provider.classifyType(makeRaw('전환사채권발행결정'))).toBe('convertible_bond');
    });

    test('신주인수권부사채권발행결정 → bond_with_warrant', () => {
      expect(provider.classifyType(makeRaw('신주인수권부사채권발행결정'))).toBe('bond_with_warrant');
    });

    test('합병결정 → merger', () => {
      expect(provider.classifyType(makeRaw('합병결정'))).toBe('merger');
    });

    test('회사분할결정 → split', () => {
      expect(provider.classifyType(makeRaw('회사분할결정'))).toBe('split');
    });

    test('주식분할결정 (액면분할) → stock_split', () => {
      expect(provider.classifyType(makeRaw('주식분할결정'))).toBe('stock_split');
    });

    test('대표이사변경 → ceo_change', () => {
      expect(provider.classifyType(makeRaw('[정정]대표이사(대표집행임원)변경'))).toBe('ceo_change');
    });

    test('주요사항보고서(자본감소결정) → capital_decrease', () => {
      expect(provider.classifyType(makeRaw('주요사항보고서(자본감소결정)'))).toBe('capital_decrease');
    });

    test('임원ㆍ주요주주특정증권등소유상황보고서 → large_shareholder', () => {
      expect(provider.classifyType(makeRaw('임원ㆍ주요주주특정증권등소유상황보고서'))).toBe('large_shareholder');
    });

    test('영업(잠정)실적(공정공시) → earnings_preliminary', () => {
      expect(provider.classifyType(makeRaw('영업(잠정)실적(공정공시)'))).toBe('earnings_preliminary');
    });

    test('영업양수결정 → business_transfer', () => {
      expect(provider.classifyType(makeRaw('영업양수결정'))).toBe('business_transfer');
    });

    test('분류 불가 공시 → null', () => {
      expect(provider.classifyType(makeRaw('사업보고서 (2025.12)'))).toBeNull();
    });
  });
});
