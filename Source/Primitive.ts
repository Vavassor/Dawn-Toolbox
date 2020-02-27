import { Color } from "./Color";
import { Point3 } from "./Geometry/Point3";

export interface LineSegment {
  endpoints: [Point3, Point3];
  style: LineStyle;
  type: "LINE_SEGMENT";
}

export interface LineSegmentSpec {
  endpoints: [Point3, Point3];
  style: LineStyle;
}

export interface LineStyle {
  color: Color;
}

export type Primitive = LineSegment | Sphere;

export interface PrimitiveContext {
  primitives: Primitive[];
}

export interface Sphere {
  center: Point3;
  radius: number;
  style: SurfaceStyle;
  type: "SPHERE";
}

export interface SphereSpec {
  center: Point3;
  radius: number;
  style: SurfaceStyle;
}

export interface SurfaceStyle {
  color: Color;
}

export const addLineSegment = (
  context: PrimitiveContext,
  spec: LineSegmentSpec
) => {
  const { endpoints, style } = spec;
  const lineSegment: LineSegment = {
    endpoints,
    style,
    type: "LINE_SEGMENT",
  };
  context.primitives.push(lineSegment);
};

export const addSphere = (context: PrimitiveContext, spec: SphereSpec) => {
  const { center, radius, style } = spec;
  const sphere: Sphere = {
    center,
    radius,
    style,
    type: "SPHERE",
  };
  context.primitives.push(sphere);
};

export const createPrimitiveContext = (): PrimitiveContext => {
  return {
    primitives: [],
  };
};

export const getIndexCount = (primitive: Primitive) => {
  switch (primitive.type) {
    case "LINE_SEGMENT":
      return 2;
    case "SPHERE": {
      const meridianCount = 10;
      const parallelCount = 6;
      const bandCount = parallelCount - 1;
      return 6 * (meridianCount * bandCount + meridianCount);
    }
  }
};

export const getVertexCount = (primitive: Primitive) => {
  switch (primitive.type) {
    case "LINE_SEGMENT":
      return 2;
    case "SPHERE": {
      const meridianCount = 10;
      const parallelCount = 6;
      const poleVertexCount = 2;
      return meridianCount * parallelCount + poleVertexCount;
    }
  }
};

export const resetPrimitives = (context: PrimitiveContext) => {
  context.primitives = [];
};
