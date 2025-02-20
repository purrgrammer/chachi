export function formatShortNumber(n: number) {
  const intl = new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  if (n < 1e3) {
    return intl.format(n);
  } else if (n < 1e6) {
    return `${intl.format(n / 1e3)}K`;
  } else if (n < 1e9) {
    return `${intl.format(n / 1e6)}M`;
  } else {
    return `${intl.format(n / 1e9)}G`;
  }
}

export function decomposeIntoPowers(total: number): number[] {
  if (total <= 0) return [];

  const result = [];
  let remaining = total;

  while (remaining > 0) {
    let power = Math.floor(Math.log2(remaining));
    let number = Math.pow(2, power);

    if (number === 0) {
      result.push(1);
      break;
    }

    result.push(number);
    remaining -= number;
  }

  return result;
}
