export class Vector2 {
  elements: number[];

  constructor(elements: number[] = [0, 0]) {
    this.elements = elements;
  }

  get length(): number {
    return Math.sqrt(this.squaredLength);
  }

  get squaredLength(): number {
    const x = this.x;
    const y = this.y;
    return x * x + y * y;
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
    return `⟨${this.x}, ${this.y}⟩`;
  }

  static add(a: Vector2, b: Vector2): Vector2 {
    return new Vector2([a.x + b.x, a.y + b.y]);
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  static divide(v: Vector2, s: number): Vector2 {
    return new Vector2([v.x / s, v.y / s]);
  }

  static multiply(s: number, v: Vector2): Vector2 {
    return new Vector2([s * v.x, s * v.y]);
  }

  static negate(v: Vector2): Vector2 {
    return new Vector2([-v.x, -v.y]);
  }

  static normalize(v: Vector2): Vector2 {
    return Vector2.divide(v, v.length);
  }

  static normalizeOrZero(v: Vector2): Vector2 {
    const length = v.length;
    if (length === 0) {
      return Vector2.zero();
    }
    return Vector2.divide(v, length);
  }

  static pointwiseDivide(a: Vector2, b: Vector2): Vector2 {
    return new Vector2([a.x / b.x, a.y / b.y]);
  }

  static pointwiseMultiply(a: Vector2, b: Vector2): Vector2 {
    return new Vector2([a.x * b.x, a.y * b.y]);
  }

  static rotate(v: Vector2, angle: number): Vector2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Vector2([c * v.x - s * v.y, s * v.x + c * v.y]);
  }

  static subtract(a: Vector2, b: Vector2): Vector2 {
    return new Vector2([a.x - b.x, a.y - b.y]);
  }

  static zero(): Vector2 {
    return new Vector2([0, 0]);
  }
}
