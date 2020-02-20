import { Point3 } from "./Point3";

export class Triangle {
  /** The vertices in counterclockwise order. */
  vertices: Point3[];

  constructor(vertices: Point3[]) {
    this.vertices = vertices;
  }
}
