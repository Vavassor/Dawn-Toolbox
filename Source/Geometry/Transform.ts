import { Point3 } from "./Point3";
import { Rotor3 } from "./Rotor3";
import { Vector3 } from "./Vector3";

export interface Transform {
  orientation: Rotor3;
  position: Point3;
  scale: Vector3;
}
