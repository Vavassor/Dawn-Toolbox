import { Rotor3 } from "./Rotor3";
import { Vector3 } from "./Vector3";
import { rotate } from "./GeometricAlgebra";

export class Matrix3 {
  rows: Vector3[];

  constructor(rows: Vector3[]) {
    this.rows = rows;
  }

  static fromRotor3(rotor: Rotor3): Matrix3 {
    return new Matrix3([
      rotate(rotor, Vector3.unitX()),
      rotate(rotor, Vector3.unitY()),
      rotate(rotor, Vector3.unitZ()),
    ]);
  }
}
