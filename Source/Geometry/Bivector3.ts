export class Bivector3 {
  elements: number[];

  constructor(elements: number[] = [0, 0, 0]) {
    this.elements = elements;
  }

  get length(): number {
    return Math.sqrt(this.squaredLength);
  }

  get squaredLength(): number {
    const xy = this.xy;
    const xz = this.xz;
    const yz = this.yz;
    return xy * xy + xz * xz + yz * yz;
  }

  get xy(): number {
    return this.elements[0];
  }

  get xz(): number {
    return this.elements[1];
  }

  get yz(): number {
    return this.elements[2];
  }

  set xy(xy: number) {
    this.elements[0] = xy;
  }

  set xz(xz: number) {
    this.elements[1] = xz;
  }

  set yz(yz: number) {
    this.elements[2] = yz;
  }

  static add(a: Bivector3, b: Bivector3): Bivector3 {
    return new Bivector3([a.xy + b.xy, a.xz + b.xz, a.yz + b.yz]);
  }

  static divide(v: Bivector3, s: number): Bivector3 {
    return new Bivector3([v.xy / s, v.xz / s, v.yz / s]);
  }

  static multiply(s: number, v: Bivector3): Bivector3 {
    return new Bivector3([s * v.xy, s * v.xz, s * v.yz]);
  }

  static negate(v: Bivector3): Bivector3 {
    return new Bivector3([-v.xy, -v.xz, -v.yz]);
  }

  static normalize(v: Bivector3): Bivector3 {
    return Bivector3.divide(v, v.length);
  }

  static pointwiseDivide(a: Bivector3, b: Bivector3): Bivector3 {
    return new Bivector3([a.xy / b.xy, a.xz / b.xz, a.yz / b.yz]);
  }

  static pointwiseMultiply(a: Bivector3, b: Bivector3): Bivector3 {
    return new Bivector3([a.xy * b.xy, a.xz * b.xz, a.yz * b.yz]);
  }

  static subtract(a: Bivector3, b: Bivector3): Bivector3 {
    return new Bivector3([a.xy - b.xy, a.xz - b.xz, a.yz - b.yz]);
  }

  static unitXY(): Bivector3 {
    return new Bivector3([1, 0, 0]);
  }

  static unitXZ(): Bivector3 {
    return new Bivector3([0, 1, 0]);
  }

  static unitYZ(): Bivector3 {
    return new Bivector3([0, 0, 1]);
  }
}
