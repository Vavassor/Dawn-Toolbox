import { Vector2 } from "./Vector2";

export class Point2 {
  elements: number[];

  constructor(elements: number[] = [0, 0]) {
    this.elements = elements;
  }

  get x(): number {
    return this.elements[0];
  }

  get y(): number {
    return this.elements[1];
  }

  set x(x: number) {
    this.elements[0] = x;
  }

  set y(y: number) {
    this.elements[1] = y;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  static add(p: Point2, v: Vector2): Point2 {
    return new Point2([p.x + v.x, p.y + v.y]);
  }

  static subtract(a: Point2, b: Point2): Vector2 {
    return new Vector2([a.x - b.x, a.y - b.y]);
  }
}
