export const groupBy = <T extends Record<K, {}>, K extends keyof T>(
  objArr: readonly T[],
  property: K
) =>
  objArr.reduce((memo, x) => {
    if (x[property]) {
      const value = x[property].toString();
      if (!memo[value]) {
        memo[value] = [];
      }
      memo[value].push(x);
    }
    return memo;
  }, {} as Record<string, T[]>);
