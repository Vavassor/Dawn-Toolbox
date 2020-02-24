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

export type Primitive = LineSegment;

export interface PrimitiveContext {
  primitives: Primitive[];
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

export const createPrimitiveContext = (): PrimitiveContext => {
  return {
    primitives: [],
  };
};

export const getVertexCount = (primitive: Primitive) => {
  switch (primitive.type) {
    case "LINE_SEGMENT":
      return 2;
  }
};

export const resetPrimitives = (context: PrimitiveContext) => {
  context.primitives = [];
};
