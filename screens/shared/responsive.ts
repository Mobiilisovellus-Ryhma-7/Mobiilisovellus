export type ResponsiveMetrics = {
  width: number;
  isTablet: boolean;
  contentMaxWidth: number;
  horizontalPadding: number;
  scale: (value: number, min?: number, max?: number) => number;
};

export function getResponsiveMetrics(width: number): ResponsiveMetrics {
  const safeWidth = Math.max(320, width);
  const isTablet = safeWidth >= 768;
  const baseWidth = isTablet ? 834 : 390;
  const ratio = Math.min(Math.max(safeWidth / baseWidth, 0.88), 1.22);

  const scale = (value: number, min?: number, max?: number) => {
    const scaled = Math.round(value * ratio);

    if (typeof min === 'number' && scaled < min) {
      return min;
    }

    if (typeof max === 'number' && scaled > max) {
      return max;
    }

    return scaled;
  };

  return {
    width: safeWidth,
    isTablet,
    contentMaxWidth: isTablet ? 680 : 560,
    horizontalPadding: isTablet ? 30 : 20,
    scale,
  };
}
