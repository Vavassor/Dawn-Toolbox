import { Bivector3 } from "./Bivector3";
import { Vector3 } from "./Vector3";
import { wedge } from "./GeometricAlgebra";
import { Quaternion } from "./Quaternion";

export class Rotor3 {
  a: number;
  b: Bivector3;

  constructor(a: number = 0, b: Bivector3 = new Bivector3()) {
    this.a = a;
    this.b = b;
  }

  get length(): number {
    return Math.sqrt(this.squaredLength);
  }

  get squaredLength(): number {
    const a = this.a;
    const b = this.b;
    return a * a + b.squaredLength;
  }

  static fromAngleAndPlane(angle: number, plane: Bivector3): Rotor3 {
    const halfAngleSin = Math.sin(angle / 2);
    const a = Math.cos(angle / 2);
    const b = Bivector3.multiply(-halfAngleSin, Bivector3.normalize(plane));
    return new Rotor3(a, b);
  }

  static fromQuaternion(q: Quaternion): Rotor3 {
    const a = q.w;
    const b = new Bivector3([-q.z, q.y, -q.x]);
    return new Rotor3(a, b);
  }

  static fromVector3Pair(a: Vector3, b: Vector3): Rotor3 {
    const scalar = Vector3.dot(a, b) + 1;
    const bivector = wedge(b, a);
    return new Rotor3(scalar, bivector);
  }

  static identity(): Rotor3 {
    return new Rotor3(1, new Bivector3([0, 0, 0]));
  }

  static multiply(s: Rotor3, t: Rotor3): Rotor3 {
    const scalar =
      s.a * t.a - s.b.xy * t.b.xy - s.b.xz * t.b.xz - s.b.yz * t.b.yz;
    const bivector = new Bivector3([
      s.b.xy * t.a + s.a * t.b.xy + s.b.yz * t.b.xz - s.b.xz * t.b.yz,
      s.b.xz * t.a + s.a * t.b.xz - s.b.yz * t.b.xy + s.b.xy * t.b.yz,
      s.b.yz * t.a + s.a * t.b.yz + s.b.xz * t.b.xy - s.b.xy * t.b.xz,
    ]);
    return new Rotor3(scalar, bivector);
  }

  static normalize(rotor: Rotor3): Rotor3 {
    const length = rotor.length;
    return new Rotor3(rotor.a / length, Bivector3.divide(rotor.b, length));
  }

  static reverse(rotor: Rotor3): Rotor3 {
    return new Rotor3(rotor.a, Bivector3.negate(rotor.b));
  }
}
