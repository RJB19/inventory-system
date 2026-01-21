export function formatChartPrice(amount) {
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  } else {
    return `₱${amount.toFixed(0)}`;
  }
}
