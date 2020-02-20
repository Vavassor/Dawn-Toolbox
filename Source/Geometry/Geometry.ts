import { wedge, biWedge } from "./GeometricAlgebra";
import { Point3 } from "./Point3";
import { Ray } from "./Ray";
import { Triangle } from "./Triangle";

export const intersectRayTriangle = (
  ray: Ray,
  triangle: Triangle
): number | null => {
  const edges = [
    Point3.subtract(triangle.vertices[1], triangle.vertices[0]),
    Point3.subtract(triangle.vertices[2], triangle.vertices[0]),
  ];
  const p = wedge(ray.direction, edges[1]);
  const determinant = biWedge(p, edges[0]).xyz;
  if (Math.abs(determinant) < 1e-6) {
    return null;
  }

  const inverseDeterminant = 1 / determinant;
  const s = Point3.subtract(ray.origin, triangle.vertices[0]);
  const u = inverseDeterminant * biWedge(p, s).xyz;
  if (u < 0 || u > 1) {
    return null;
  }

  const q = wedge(s, edges[0]);
  const v = inverseDeterminant * biWedge(q, ray.direction).xyz;
  if (v < 0 || u + v > 1) {
    return null;
  }

  return biWedge(q, edges[1]).xyz;
};
