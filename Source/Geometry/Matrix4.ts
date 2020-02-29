import { Point3 } from "./Point3";
import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";

export class Matrix4 {
  rows: Vector4[];

  constructor(rows: Vector4[]) {
    this.rows = rows;
  }

  getColumn(index: number): Vector4 {
    return new Vector4([
      this.rows[0].elements[index],
      this.rows[1].elements[index],
      this.rows[2].elements[index],
      this.rows[3].elements[index],
    ]);
  }

  getRow(index: number): Vector4 {
    return this.rows[index];
  }

  static dilation(dilation: Vector3): Matrix4 {
    return new Matrix4([
      new Vector4([dilation.x, 0, 0, 0]),
      new Vector4([0, dilation.y, 0, 0]),
      new Vector4([0, 0, dilation.z, 0]),
      Vector4.unitW(),
    ]);
  }

  static identity(): Matrix4 {
    return new Matrix4([
      Vector4.unitX(),
      Vector4.unitY(),
      Vector4.unitZ(),
      Vector4.unitW(),
    ]);
  }

  static inverse(m: Matrix4): Matrix4 {
    const r = m.rows;

    const s = [
      r[0].x * r[1].y - r[1].x * r[0].y,
      r[0].x * r[1].z - r[1].x * r[0].z,
      r[0].x * r[1].w - r[1].x * r[0].w,
      r[0].y * r[1].z - r[1].y * r[0].z,
      r[0].y * r[1].w - r[1].y * r[0].w,
      r[0].z * r[1].w - r[1].z * r[0].w,
    ];

    const c = [
      r[2].x * r[3].y - r[3].x * r[2].y,
      r[2].x * r[3].z - r[3].x * r[2].z,
      r[2].x * r[3].w - r[3].x * r[2].w,
      r[2].y * r[3].z - r[3].y * r[2].z,
      r[2].y * r[3].w - r[3].y * r[2].w,
      r[2].z * r[3].w - r[3].z * r[2].w,
    ];

    const determinant =
      s[0] * c[5] -
      s[1] * c[4] +
      s[2] * c[3] +
      s[3] * c[2] -
      s[4] * c[1] +
      s[5] * c[0];

    if (determinant === 0) {
      return m;
    }

    const d = 1 / determinant;

    return new Matrix4([
      new Vector4([
        d * (r[1].y * c[5] - r[1].z * c[4] + r[1].w * c[3]),
        d * (-r[0].y * c[5] + r[0].z * c[4] - r[0].w * c[3]),
        d * (r[3].y * s[5] - r[3].z * s[4] + r[3].w * s[3]),
        d * (-r[2].y * s[5] + r[2].z * s[4] - r[2].w * s[3]),
      ]),
      new Vector4([
        d * (-r[1].x * c[5] + r[1].z * c[2] - r[1].w * c[1]),
        d * (r[0].x * c[5] - r[0].z * c[2] + r[0].w * c[1]),
        d * (-r[3].x * s[5] + r[3].z * s[2] - r[3].w * s[1]),
        d * (r[2].x * s[5] - r[2].z * s[2] + r[2].w * s[1]),
      ]),
      new Vector4([
        d * (r[1].x * c[4] - r[1].y * c[2] + r[1].w * c[0]),
        d * (-r[0].x * c[4] + r[0].y * c[2] - r[0].w * c[0]),
        d * (r[3].x * s[4] - r[3].y * s[2] + r[3].w * s[0]),
        d * (-r[2].x * s[4] + r[2].y * s[2] - r[2].w * s[0]),
      ]),
      new Vector4([
        d * (-r[1].x * c[3] + r[1].y * c[1] - r[1].z * c[0]),
        d * (r[0].x * c[3] - r[0].y * c[1] + r[0].z * c[0]),
        d * (-r[3].x * s[3] + r[3].y * s[1] - r[3].z * s[0]),
        d * (r[2].x * s[3] - r[2].y * s[1] + r[2].z * s[0]),
      ]),
    ]);
  }

  /**
   * Create a transform from world space to view space.
   *
   * This assumes a right handed coordinate system.
   *
   * @param position the view position
   * @param target the point to look toward
   * @param worldUp the world space up axis
   * @return a transform from world space to view space
   */
  static lookAtRh(position: Point3, target: Point3, worldUp: Vector3): Matrix4 {
    const forward = Vector3.normalize(Point3.subtract(position, target));
    const right = Vector3.normalize(Vector3.cross(worldUp, forward));
    const up = Vector3.normalize(Vector3.cross(forward, right));
    return Matrix4.view(right, up, forward, position);
  }

  static multiply(a: Matrix4, b: Matrix4): Matrix4 {
    const result = Matrix4.identity();
    for (let i = 0; i < 4; i++) {
      const row = a.rows[i];
      for (let j = 0; j < 4; j++) {
        const column = b.getColumn(j);
        result.rows[i].elements[j] = Vector4.dot(row, column);
      }
    }
    return result;
  }

  /**
   * Create a perspective projection from view space to clip space.
   *
   * This assumes a right handed coordinate system and clip space whose depth
   * is in the range [-1, 1].
   *
   * @param fovy the vertical field of view in radians
   * @param width the width of the cross section
   * @param height the height of the cross section
   * @param nearPlane the distance to the near plane
   * @param farPlane the distance to the far plane
   * @return a perspective projection matrix
   */
  static perspective(
    fovy: number,
    width: number,
    height: number,
    nearPlane: number,
    farPlane: number
  ): Matrix4 {
    const coty = 1 / Math.tan(fovy / 2);
    const aspectRatio = width / height;
    const negDepth = nearPlane - farPlane;
    return new Matrix4([
      new Vector4([coty / aspectRatio, 0, 0, 0]),
      new Vector4([0, coty, 0, 0]),
      new Vector4([
        0,
        0,
        (nearPlane + farPlane) / negDepth,
        (2 * nearPlane * farPlane) / negDepth,
      ]),
      new Vector4([0, 0, -1, 0]),
    ]);
  }

  static toFloat32Array(m: Matrix4): Float32Array {
    const elements = m.rows.reduce(
      (elements, row) => elements.concat(row.elements),
      [] as number[]
    );
    return new Float32Array(elements);
  }

  static transformPoint3(m: Matrix4, p: Point3): Point3 {
    const r = new Vector4([p.x, p.y, p.z, 1]);
    const a = Vector4.dot(m.rows[3], r);
    return new Point3([
      Vector4.dot(m.rows[0], r) / a,
      Vector4.dot(m.rows[1], r) / a,
      Vector4.dot(m.rows[2], r) / a,
    ]);
  }

  static transformVector3(m: Matrix4, v: Vector3): Vector3 {
    const r = Vector4.fromVector3(v);
    return new Vector3([
      Vector4.dot(m.rows[0], r),
      Vector4.dot(m.rows[1], r),
      Vector4.dot(m.rows[2], r),
    ]);
  }

  static translation(translation: Vector3): Matrix4 {
    return new Matrix4([
      new Vector4([1, 0, 0, translation.x]),
      new Vector4([0, 1, 0, translation.y]),
      new Vector4([0, 0, 1, translation.z]),
      Vector4.unitW(),
    ]);
  }

  static transpose(m: Matrix4): Matrix4 {
    return new Matrix4([
      m.getColumn(0),
      m.getColumn(1),
      m.getColumn(2),
      m.getColumn(3),
    ]);
  }

  /**
   * Create a transform from world space to view space.
   *
   * This assumes a right handed coordinate system.
   *
   * @param position the view position
   * @param yaw
   * @param pitch
   * @param worldUp the world space up axis
   * @return a transform from world space to view space
   */
  static turnRh(
    position: Point3,
    yaw: number,
    pitch: number,
    worldUp: Vector3
  ): Matrix4 {
    const forward = Vector3.normalize(
      new Vector3([
        Math.cos(pitch) * Math.cos(yaw),
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
      ])
    );
    const right = Vector3.normalize(Vector3.cross(worldUp, forward));
    const up = Vector3.normalize(Vector3.cross(forward, right));
    return Matrix4.view(right, up, forward, position);
  }

  /**
   * Create a transform from world space to view space.
   *
   * @param xAxis the orientation X axis of the view
   * @param yAxis the orientation Y axis of the view
   * @param zAxis the orientation Z axis of the view
   * @param position the view position
   * @return a view matrix
   */
  static view(
    xAxis: Vector3,
    yAxis: Vector3,
    zAxis: Vector3,
    position: Point3
  ): Matrix4 {
    const p = Vector3.fromPoint3(position);
    return new Matrix4([
      new Vector4([xAxis.x, xAxis.y, xAxis.z, -Vector3.dot(xAxis, p)]),
      new Vector4([yAxis.x, yAxis.y, yAxis.z, -Vector3.dot(yAxis, p)]),
      new Vector4([zAxis.x, zAxis.y, zAxis.z, -Vector3.dot(zAxis, p)]),
      Vector4.unitW(),
    ]);
  }
}
