// backend/src/services/disclosure/providers/dart.provider.ts
import type { DisclosureProvider, DisclosureType, RawDisclosure } from '../types.js';

interface DartListItem {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  report_nm: string;
  rcept_no: string;
  rcept_dt: string;
  corp_cls: string; // Y=KOSPI, K=KOSDAQ, N=KONEX, E=기타
  flr_nm: string;
}

interface DartListResponse {
  status: string;
  message: string;
  page_no: number;
  page_count: number;
  total_count: number;
  total_page: number;
  list: DartListItem[];
}

// 공시 제목 → 대분류 매핑 규칙 (순서 중요: 먼저 매칭되는 규칙 적용)
const CLASSIFICATION_RULES: Array<{
  test: (title: string) => boolean;
  type: DisclosureType;
}> = [
  { test: (t) => t.includes('자기주식') && t.includes('취득'), type: 'treasury_stock_acquire' },
  { test: (t) => t.includes('자기주식') && t.includes('처분'), type: 'treasury_stock_dispose' },
  { test: (t) => t.includes('유상증자') || (t.includes('주주배정') && t.includes('증자')), type: 'capital_increase' },
  { test: (t) => t.includes('자본감소') || t.includes('감자'), type: 'capital_decrease' },
  { test: (t) => t.includes('신주인수권부사채'), type: 'bond_with_warrant' },
  { test: (t) => t.includes('전환사채'), type: 'convertible_bond' },
  { test: (t) => t.includes('합병'), type: 'merger' },
  { test: (t) => t.includes('주식분할') || t.includes('액면분할'), type: 'stock_split' },
  { test: (t) => t.includes('분할') && !t.includes('주식분할') && !t.includes('액면분할'), type: 'split' },
  { test: (t) => t.includes('대표이사') || t.includes('대표집행임원'), type: 'ceo_change' },
  { test: (t) => t.includes('주요주주') || t.includes('대량보유'), type: 'large_shareholder' },
  { test: (t) => (t.includes('잠정') && t.includes('실적')) || t.includes('영업실적'), type: 'earnings_preliminary' },
  { test: (t) => t.includes('영업양수') || t.includes('영업양도'), type: 'business_transfer' },
];

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';

export class DartProvider implements DisclosureProvider {
  source = 'dart' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  classifyType(raw: RawDisclosure): DisclosureType | null {
    const title = raw.title;
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.test(title)) {
        return rule.type;
      }
    }
    return null;
  }

  async fetchRecent(date: string): Promise<RawDisclosure[]> {
    const dateStr = date.replace(/-/g, '');
    return this.fetchList(dateStr, dateStr);
  }

  async fetchHistorical(from: string, to: string): Promise<RawDisclosure[]> {
    const fromStr = from.replace(/-/g, '');
    const toStr = to.replace(/-/g, '');
    return this.fetchList(fromStr, toStr);
  }

  private async fetchList(bgn_de: string, end_de: string): Promise<RawDisclosure[]> {
    const results: RawDisclosure[] = [];
    let pageNo = 1;
    let totalPage = 1;

    while (pageNo <= totalPage) {
      const url = new URL(`${DART_BASE_URL}/list.json`);
      url.searchParams.set('crtfc_key', this.apiKey);
      url.searchParams.set('bgn_de', bgn_de);
      url.searchParams.set('end_de', end_de);
      url.searchParams.set('page_no', String(pageNo));
      url.searchParams.set('page_count', '100');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`DART API error: ${response.status} ${response.statusText}`);
      }

      const data: DartListResponse = await response.json();

      // status "013" = 조회결과 없음
      if (data.status === '013') {
        break;
      }

      if (data.status !== '000') {
        throw new Error(`DART API error: ${data.status} ${data.message}`);
      }

      totalPage = data.total_page;

      for (const item of data.list) {
        // 상장사만 (Y=KOSPI, K=KOSDAQ)
        if (item.corp_cls !== 'Y' && item.corp_cls !== 'K') continue;

        results.push({
          sourceId: item.rcept_no,
          corpCode: item.corp_code,
          corpName: item.corp_name,
          stockCode: item.stock_code || null,
          market: item.corp_cls,
          title: item.report_nm,
          disclosedAt: `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`,
          sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
          rawType: item.corp_cls,
        });
      }

      pageNo++;
    }

    return results;
  }
}
