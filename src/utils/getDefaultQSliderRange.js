/** Default Q slider bounds: Qq through UQ4 (inclusive). */
export function getDefaultQSliderRange(difficulties) {
  const qDifficulties = difficulties
    .filter(d => d.name.includes('Q'))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (qDifficulties.length === 0) {
    return { names: [], drag: [1, 1] };
  }

  const minDiff = qDifficulties.find(d => d.name.startsWith('Qq'));
  const maxDiff = qDifficulties.find(d => d.name.startsWith('UQ4'));

  if (!minDiff || !maxDiff) {
    return {
      names: qDifficulties.map(d => d.name),
      drag: [qDifficulties[0].sortOrder, qDifficulties[qDifficulties.length - 1].sortOrder],
    };
  }

  const rangeDiffs = qDifficulties.filter(
    d => d.sortOrder >= minDiff.sortOrder && d.sortOrder <= maxDiff.sortOrder
  );

  return {
    names: rangeDiffs.map(d => d.name),
    drag: [minDiff.sortOrder, maxDiff.sortOrder],
  };
}
