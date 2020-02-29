import { rotate } from "./GeometricAlgebra";
import { Matrix4 } from "./Matrix4";
import { Rotor3 } from "./Rotor3";
import { Vector3 } from "./Vector3";

export class Matrix3 {
  rows: Vector3[];

  constructor(rows: Vector3[]) {
    this.rows = rows;
  }

  getColumn(index: number): Vector3 {
    return new Vector3([
      this.rows[0].elements[index],
      this.rows[1].elements[index],
      this.rows[2].elements[index],
    ]);
  }

  static fromMatrix4(m: Matrix4): Matrix3 {
    return new Matrix3([
      Vector3.fromVector4(m.rows[0]),
      Vector3.fromVector4(m.rows[1]),
      Vector3.fromVector4(m.rows[2]),
    ]);
  }

  static fromRotor3(rotor: Rotor3): Matrix3 {
    return new Matrix3([
      rotate(rotor, Vector3.unitX()),
      rotate(rotor, Vector3.unitY()),
      rotate(rotor, Vector3.unitZ()),
    ]);
  }

  static toFloat32Array(m: Matrix3): Float32Array {
    const elements = m.rows.reduce(
      (elements, row) => elements.concat(row.elements),
      [] as number[]
    );
    return new Float32Array(elements);
  }

  static transpose(m: Matrix3): Matrix3 {
    return new Matrix3([m.getColumn(0), m.getColumn(1), m.getColumn(2)]);
  }
}
