const style = getComputedStyle(document.documentElement);
const get = (name) => style.getPropertyValue(name).trim();

export const CHART_COLORS = [
  get('--chart-1'),
  get('--chart-2'),
  get('--chart-3'),
  get('--chart-4'),
  get('--chart-5'),
  get('--chart-6'),
];
