// backend/tests/disclosure/batch.service.test.ts
import { jest } from '@jest/globals';
import { BatchService } from '../../src/services/disclosure/batch.service.js';

describe('BatchService', () => {
  test('collectDisclosures — provider에서 수집 후 분류하여 저장한다', async () => {
    const mockProvider = {
      source: 'dart' as const,
      fetchRecent: jest.fn<any>().mockResolvedValue([
        {
          sourceId: '001',
          corpCode: '00126380',
          corpName: '삼성전자',
          stockCode: '005930',
          title: '자기주식취득결정',
          disclosedAt: '2026-03-24',
          sourceUrl: 'https://dart.fss.or.kr/test',
          rawType: 'Y',
        },
        {
          sourceId: '002',
          corpCode: '00164779',
          corpName: '비상장기업',
          stockCode: null,
          title: '사업보고서',
          disclosedAt: '2026-03-24',
          sourceUrl: 'https://dart.fss.or.kr/test2',
          rawType: 'E',
        },
      ]),
      classifyType: jest.fn<any>()
        .mockReturnValueOnce('treasury_stock_acquire')
        .mockReturnValueOnce(null),
      fetchHistorical: jest.fn<any>(),
    };

    const mockDisclosureService = {
      saveDisclosures: jest.fn<any>().mockResolvedValue(undefined),
    };

    const batch = new BatchService(
      mockProvider as any,
      mockDisclosureService as any,
      null as any,
      null as any,
    );

    const result = await batch.collectDisclosures('2026-03-24');

    expect(mockProvider.fetchRecent).toHaveBeenCalledWith('2026-03-24');
    expect(mockDisclosureService.saveDisclosures).toHaveBeenCalledWith(
      'dart',
      expect.arrayContaining([
        expect.objectContaining({ sourceId: '001', classifiedType: 'treasury_stock_acquire' }),
        expect.objectContaining({ sourceId: '002', classifiedType: null }),
      ])
    );
    expect(result.total).toBe(2);
    expect(result.classified).toBe(1);
  });
});
