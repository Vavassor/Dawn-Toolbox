import { Vector3 } from "./Vector3";

export class Vector4 {
  elements: number[];

  constructor(elements: number[] = [0, 0, 0, 0]) {
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

  get w(): number {
    return this.elements[3];
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

  set w(w: number) {
    this.elements[3] = w;
  }

  toString(): string {
    return `⟨${this.x}, ${this.y}, ${this.z}, ${this.w}⟩`;
  }

  static dot(a: Vector4, b: Vector4): number {
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  }

  static fromVector3(v: Vector3): Vector4 {
    return new Vector4([v.x, v.y, v.z, 0]);
  }

  static unitX(): Vector4 {
    return new Vector4([1, 0, 0, 0]);
  }

  static unitY(): Vector4 {
    return new Vector4([0, 1, 0, 0]);
  }

  static unitZ(): Vector4 {
    return new Vector4([0, 0, 1, 0]);
  }

  static unitW(): Vector4 {
    return new Vector4([0, 0, 0, 1]);
  }
}
