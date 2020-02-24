import { Vector3 } from "./Vector3";

export class Point3 {
  elements: number[];

  constructor(elements: number[] = [0, 0, 0]) {
    this.elements = elements;
  }

  get x(): number {
    return this.elements[0];
  }

  get y(): number {
    return this.elements[1];
  }

  get z(): number {
    return this.elements[2];
  }

  set x(x: number) {
    this.elements[0] = x;
  }

  set y(y: number) {
    this.elements[1] = y;
  }

  set z(z: number) {
    this.elements[2] = z;
  }

  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }

  static add(p: Point3, v: Vector3): Point3 {
    return new Point3([p.x + v.x, p.y + v.y, p.z + v.z]);
  }

  static fromVector3(v: Vector3): Point3 {
    return new Point3([v.x, v.y, v.z]);
  }

  static subtract(a: Point3, b: Point3): Vector3 {
    return new Vector3([a.x - b.x, a.y - b.y, a.z - b.z]);
  }

  static zero(): Point3 {
    return new Point3([0, 0, 0]);
  }
}
