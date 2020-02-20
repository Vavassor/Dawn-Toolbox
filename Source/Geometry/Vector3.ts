import { Point3 } from "./Point3";

export class Vector3 {
  elements: number[];

  constructor(elements: number[] = [0, 0, 0]) {
    this.elements = elements;
  }

  get length(): number {
    return Math.sqrt(this.squaredLength);
  }

  get squaredLength(): number {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    return x * x + y * y + z * z;
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
    return `⟨${this.x}, ${this.y}, ${this.z}⟩`;
  }

  static add(a: Vector3, b: Vector3): Vector3 {
    return new Vector3([a.x + b.x, a.y + b.y, a.z + b.z]);
  }

  static cross(a: Vector3, b: Vector3): Vector3 {
    return new Vector3([
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x,
    ]);
  }

  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static divide(v: Vector3, s: number): Vector3 {
    return new Vector3([v.x / s, v.y / s, v.z / s]);
  }

  static fromPoint3(point: Point3): Vector3 {
    return new Vector3([point.x, point.y, point.z]);
  }

  static multiply(s: number, v: Vector3): Vector3 {
    return new Vector3([s * v.x, s * v.y, s * v.z]);
  }

  static negate(v: Vector3): Vector3 {
    return new Vector3([-v.x, -v.y, -v.z]);
  }

  static normalize(v: Vector3): Vector3 {
    return Vector3.divide(v, v.length);
  }

  static pointwiseDivide(a: Vector3, b: Vector3): Vector3 {
    return new Vector3([a.x / b.x, a.y / b.y, a.z / b.z]);
  }

  static pointwiseMultiply(a: Vector3, b: Vector3): Vector3 {
    return new Vector3([a.x * b.x, a.y * b.y, a.z * b.z]);
  }

  static project(a: Vector3, b: Vector3): Vector3 {
    return Vector3.multiply(Vector3.dot(a, b) / b.squaredLength, b);
  }

  static reject(a: Vector3, b: Vector3): Vector3 {
    return Vector3.subtract(b, Vector3.project(a, b));
  }

  static subtract(a: Vector3, b: Vector3): Vector3 {
    return new Vector3([a.x - b.x, a.y - b.y, a.z - b.z]);
  }

  static unitX(): Vector3 {
    return new Vector3([1, 0, 0]);
  }

  static unitY(): Vector3 {
    return new Vector3([0, 1, 0]);
  }

  static unitZ(): Vector3 {
    return new Vector3([0, 0, 1]);
  }

  static zero(): Vector3 {
    return new Vector3([0, 0, 0]);
  }
}
