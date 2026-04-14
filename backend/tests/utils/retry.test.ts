import { jest } from '@jest/globals';
import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
  test('첫 시도에 성공하면 바로 반환', async () => {
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('실패 후 재시도하여 성공', async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('최대 재시도 초과 시 마지막 에러 throw', async () => {
    const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('always fail'));
    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 }))
      .rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
