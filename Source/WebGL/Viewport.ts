import { GloContext } from "./GloContext";

export interface Viewport {
  bottomLeftX: number;
  bottomLeftY: number;
  farPlane: number;
  height: number;
  nearPlane: number;
  width: number;
}

export const setViewport = (context: GloContext, viewport: Viewport): void => {
  const { gl } = context;
  const {
    bottomLeftX,
    bottomLeftY,
    farPlane,
    height,
    nearPlane,
    width,
  } = viewport;
  gl.viewport(bottomLeftX, bottomLeftY, width, height);
  gl.depthRange(nearPlane, farPlane);
};
