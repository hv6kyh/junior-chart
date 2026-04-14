// backend/tests/disclosure/disclosure.service.test.ts
import { jest } from '@jest/globals';
import { DisclosureService } from '../../src/services/disclosure/disclosure.service.js';
import type { RawDisclosure, DisclosureType } from '../../src/services/disclosure/types.js';

// Supabase 클라이언트 mock
const mockFrom = jest.fn<() => any>();
const mockSupabase = { from: mockFrom } as any;

describe('DisclosureService', () => {
  let service: DisclosureService;

  beforeEach(() => {
    service = new DisclosureService(mockSupabase);
    jest.clearAllMocks();
  });

  test('saveDisclosures — 공시를 Supabase에 upsert한다', async () => {
    const mockUpsert = jest.fn<() => Promise<any>>().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const raws: Array<RawDisclosure & { classifiedType: DisclosureType | null }> = [
      {
        sourceId: 'test-001',
        corpCode: '00126380',
        corpName: '삼성전자',
        stockCode: '005930',
        market: 'Y',
        title: '자기주식취득결정',
        disclosedAt: '2026-03-24',
        sourceUrl: 'https://dart.fss.or.kr/test',
        rawType: 'Y',
        classifiedType: 'treasury_stock_acquire',
      },
    ];

    await service.saveDisclosures('dart', raws);

    expect(mockFrom).toHaveBeenCalledWith('disclosures');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'dart',
          source_id: 'test-001',
          disclosure_type: 'treasury_stock_acquire',
        }),
      ]),
      { onConflict: 'source,source_id' }
    );
  });

  test('getTodayDisclosures — 오늘 공시 목록을 반환한다', async () => {
    const mockSelect = jest.fn<() => any>().mockReturnValue({
      eq: jest.fn<() => any>().mockReturnValue({
        order: jest.fn<() => Promise<any>>().mockResolvedValue({
          data: [{ id: '1', title: '자기주식취득결정', disclosure_type: 'treasury_stock_acquire' }],
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await service.getDisclosuresByDate('2026-03-24');
    expect(mockFrom).toHaveBeenCalledWith('disclosures');
    expect(result).toHaveLength(1);
  });
});
