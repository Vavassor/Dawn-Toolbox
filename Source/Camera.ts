import { Matrix4 } from "./Geometry/Matrix4";
import { Point3 } from "./Geometry/Point3";
import { Vector3 } from "./Geometry/Vector3";

export interface Camera {
  farClipPlane: number;
  nearClipPlane: number;
  pitch: number;
  position: Point3;
  verticalFieldOfView: number;
  yaw: number;
}

export const getProjection = (
  camera: Camera,
  targetWidth: number,
  targetHeight: number
): Matrix4 => {
  const { farClipPlane, nearClipPlane, verticalFieldOfView } = camera;
  return Matrix4.perspective(
    verticalFieldOfView,
    targetWidth,
    targetHeight,
    nearClipPlane,
    farClipPlane
  );
};

export const getView = (camera: Camera): Matrix4 => {
  const { pitch, position, yaw } = camera;
  return Matrix4.turnRh(position, yaw, pitch, Vector3.unitZ());
};
