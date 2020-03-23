import { Vector4 } from "./Geometry/Vector4";

export const packSByte4FromVector4 = (vector: Vector4): number => {
  const x = packSnorm(vector.x);
  const y = packSnorm(vector.y);
  const z = packSnorm(vector.z);
  const w = packSnorm(vector.w);
  return (w << 24) | (z << 16) | (y << 8) | x;
};

export const packSnorm = (value: number): number => {
  const x = getSByteFromSnorm(value);
  return x < 0 ? x + 256 : x;
};

const getSByteFromSnorm = (value: number): number => {
  return Math.floor(127.5 * value);
};
