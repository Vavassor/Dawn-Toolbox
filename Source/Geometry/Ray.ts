import { Point3 } from "./Point3";
import { Vector3 } from "./Vector3";

export class Ray {
  direction: Vector3;
  origin: Point3;

  constructor(origin: Point3, direction: Vector3) {
    this.origin = origin;
    this.direction = direction;
  }
}
