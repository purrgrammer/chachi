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
