import { Bivector2 } from "./Bivector2";
import { Bivector3 } from "./Bivector3";
import { Rotor3 } from "./Rotor3";
import { Trivector3 } from "./Trivector3";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";

export const biWedge = (a: Bivector3, b: Vector3): Trivector3 => {
  return new Trivector3(-a.yz * b.x + a.xz * b.y - a.xy * b.z);
};

export const rotate = (rotor: Rotor3, vector: Vector3): Vector3 => {
  const q = new Vector3([
    rotor.a * vector.x + rotor.b.xy * vector.y + rotor.b.xz * vector.z,
    rotor.a * vector.y - rotor.b.xy * vector.x + rotor.b.yz * vector.z,
    rotor.a * vector.z - rotor.b.xz * vector.x - rotor.b.yz * vector.y,
  ]);
  const w = biWedge(rotor.b, vector);
  return new Vector3([
    rotor.a * q.x + rotor.b.xy * q.y + rotor.b.xz * q.z - rotor.b.yz * w.xyz,
    rotor.a * q.y - rotor.b.xy * q.x + rotor.b.xz * w.xyz + rotor.b.yz * q.z,
    rotor.a * q.z - rotor.b.xy * w.xyz - rotor.b.xz * q.x - rotor.b.yz * q.y,
  ]);
};

export const wedge = (a: Vector3, b: Vector3): Bivector3 => {
  return new Bivector3([
    a.x * b.y - a.y * b.x,
    a.x * b.z - a.z * b.x,
    a.y * b.z - a.z * b.y,
  ]);
};

export const wedge2 = (a: Vector2, b: Vector2): Bivector2 => {
  return new Bivector2(a.x * b.y - a.y * b.x);
};
