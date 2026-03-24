export function formatReturn(val: number | null): string {
  if (val === null) return '-';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

export function formatRate(val: number | null): string {
  if (val === null) return '-';
  return `${(val * 100).toFixed(0)}%`;
}
