import { Rotor3 } from "./Rotor3";

export class Quaternion {
  elements: number[];

  constructor(elements: number[] = [0, 0, 0, 0]) {
    this.elements = elements;
  }

  get w(): number {
    return this.elements[0];
  }

  get x(): number {
    return this.elements[1];
  }

  get y(): number {
    return this.elements[2];
  }

  get z(): number {
    return this.elements[3];
  }

  set w(w: number) {
    this.elements[0] = w;
  }

  set x(x: number) {
    this.elements[1] = x;
  }

  set y(y: number) {
    this.elements[2] = y;
  }

  set z(z: number) {
    this.elements[3] = z;
  }

  toString(): string {
    return `(${this.w}, ${this.x}, ${this.y}, ${this.z})`;
  }
}
