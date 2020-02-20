export const isAlmostEqual = (
  a: number,
  b: number,
  tolerance: number = Number.EPSILON
) => {
  return Math.abs(a - b) < tolerance;
};
