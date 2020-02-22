import { Vector2 } from "./Geometry/Vector2";

export const clamp = (x: number, min: number, max: number): number => {
  return Math.max(Math.min(x, max), min);
};

export const limitUnitLength = (vector: Vector2): Vector2 => {
  const length = vector.length;
  if (length > 0) {
    return Vector2.divide(vector, length);
  }
  return vector;
};
