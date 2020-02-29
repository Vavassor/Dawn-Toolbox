import { App } from "./App";
import { Color } from "./Color";
import { GloBuffer, updateBuffer } from "./WebGL/GloBuffer";
import { GloContext, draw } from "./WebGL/GloContext";
import { setPipeline, getBytesPerVertex } from "./WebGL/Pipeline";
import { Point3 } from "./Geometry/Point3";
import {
  LineSegment,
  Sphere,
  getIndexCount,
  getVertexCount,
} from "./Primitive";
import { Vector3 } from "./Geometry/Vector3";
import { packSByte4FromVector4 } from "./Packing";
import { Vector4 } from "./Geometry/Vector4";

export const PRIMITIVE_BATCH_CAP_IN_BYTES = 16384;

interface Batch {
  index: {
    buffer: GloBuffer;
    byteCount: number;
    count: number;
  };
  vertex: {
    buffer: GloBuffer;
    byteCount: number;
    count: number;
  };
}

export const drawPrimitives = (app: App) => {
  drawLines(app);
  drawSurfaces(app);
};

const batchLineSegment = (
  vertexBuffer: ArrayBuffer,
  indexBuffer: ArrayBuffer,
  lineSegment: LineSegment,
  baseIndex: number
) => {
  const { endpoints, style } = lineSegment;

  const componentCount = 4;
  const color = Color.toRgbaInteger(style.color);

  const floatView = new Float32Array(vertexBuffer);
  const uint32View = new Uint32Array(vertexBuffer);
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    batchVertex(floatView, uint32View, componentCount * i, endpoint, color);
  }

  const uint16View = new Uint16Array(indexBuffer);
  for (let i = 0; i < endpoints.length; i++) {
    uint16View[i] = baseIndex + i;
  }
};

const batchSphereIndices = (indexBuffer: ArrayBuffer, baseIndex: number) => {
  const uint16View = new Uint16Array(indexBuffer);

  const northPoleIndex = baseIndex;
  const southPoleIndex = baseIndex + 1;
  const indexAfterPoles = baseIndex + 2;

  const meridianCount = 10;
  const parallelCount = 6;
  const bandCount = parallelCount - 1;
  let writeTotal = 0;

  const northCapParallel = indexAfterPoles;
  for (let i = 0; i < meridianCount; i++) {
    const writeIndex = 3 * i;
    uint16View[writeIndex] = northPoleIndex;
    uint16View[writeIndex + 1] = i + northCapParallel;
    uint16View[writeIndex + 2] = ((i + 1) % meridianCount) + northCapParallel;
  }
  writeTotal += 3 * meridianCount;

  const southCapParallel = meridianCount * bandCount + indexAfterPoles;
  for (let i = 0; i < meridianCount; i++) {
    const writeIndex = 3 * i + writeTotal;
    uint16View[writeIndex] = southPoleIndex;
    uint16View[writeIndex + 1] = ((i + 1) % meridianCount) + southCapParallel;
    uint16View[writeIndex + 2] = i + southCapParallel;
  }
  writeTotal += 3 * meridianCount;

  for (let i = 0; i < bandCount; i++) {
    const parallel = [
      meridianCount * i,
      meridianCount * ((i + 1) % parallelCount),
    ];
    for (let j = 0; j < meridianCount; j++) {
      const writeIndex = 6 * (meridianCount * i + j) + writeTotal;
      const meridian = [j, (j + 1) % meridianCount];
      const indices = [
        meridian[0] + parallel[0] + indexAfterPoles,
        meridian[0] + parallel[1] + indexAfterPoles,
        meridian[1] + parallel[1] + indexAfterPoles,
        meridian[1] + parallel[0] + indexAfterPoles,
      ];
      uint16View[writeIndex] = indices[0];
      uint16View[writeIndex + 1] = indices[1];
      uint16View[writeIndex + 2] = indices[2];
      uint16View[writeIndex + 3] = indices[0];
      uint16View[writeIndex + 4] = indices[2];
      uint16View[writeIndex + 5] = indices[3];
    }
  }
};

const batchSphereVertices = (vertexBuffer: ArrayBuffer, sphere: Sphere) => {
  const { center, radius, style } = sphere;

  const componentCount = 5;
  const floatView = new Float32Array(vertexBuffer);
  const uint32View = new Uint32Array(vertexBuffer);
  const color = Color.toRgbaInteger(style.color);

  const meridianCount = 10;
  const parallelCount = 6;
  const deltaInclinationPerParallel = Math.PI / (parallelCount + 1);
  const deltaAzimuthPerMeridian = (2 * Math.PI) / meridianCount;

  const northPole = Point3.add(
    center,
    Vector3.multiply(radius, Vector3.unitZ())
  );
  batchLitVertex(floatView, uint32View, 0, northPole, Vector3.unitZ(), color);

  const southPole = Point3.add(
    center,
    Vector3.multiply(-radius, Vector3.unitZ())
  );
  batchLitVertex(
    floatView,
    uint32View,
    componentCount,
    southPole,
    Vector3.negate(Vector3.unitZ()),
    color
  );

  const indexAfterPoles = 2 * componentCount;

  for (let parallel = 0; parallel < parallelCount; parallel++) {
    const inclination = (parallel + 1) * deltaInclinationPerParallel;
    for (let meridian = 0; meridian < meridianCount; meridian++) {
      const azimuth = meridian * deltaAzimuthPerMeridian;
      const direction = Vector3.fromSphericalCoordinates(
        radius,
        inclination,
        azimuth
      );
      const point = Point3.add(center, direction);
      const pointIndex = meridianCount * parallel + meridian;
      const vertexIndex = componentCount * pointIndex + indexAfterPoles;
      const normal = Vector3.normalize(direction);
      batchLitVertex(floatView, uint32View, vertexIndex, point, normal, color);
    }
  }
};

const batchVertex = (
  floatView: Float32Array,
  uint32View: Uint32Array,
  index: number,
  point: Point3,
  colorInteger: number
) => {
  floatView[index] = point.x;
  floatView[index + 1] = point.y;
  floatView[index + 2] = point.z;
  uint32View[index + 3] = colorInteger;
};

const batchLitVertex = (
  floatView: Float32Array,
  uint32View: Uint32Array,
  index: number,
  point: Point3,
  normal: Vector3,
  colorInteger: number
) => {
  floatView[index] = point.x;
  floatView[index + 1] = point.y;
  floatView[index + 2] = point.z;
  uint32View[index + 3] = packSByte4FromVector4(Vector4.fromVector3(normal));
  uint32View[index + 4] = colorInteger;
};

const completeBatch = (context: GloContext, batch: Batch) => {
  if (batch.index.count === 0) {
    return;
  }

  draw(context, {
    indicesCount: batch.index.count,
    startIndex: 0,
    indexBuffer: batch.index.buffer,
    vertexBuffers: [batch.vertex.buffer],
  });
};

const createBatch = (
  vertexBuffer: GloBuffer,
  indexBuffer: GloBuffer
): Batch => {
  return {
    index: {
      buffer: indexBuffer,
      byteCount: 0,
      count: 0,
    },
    vertex: {
      buffer: vertexBuffer,
      byteCount: 0,
      count: 0,
    },
  };
};

const drawBatchIfFull = (
  context: GloContext,
  batch: Batch,
  indexByteCount: number,
  vertexByteCount: number
) => {
  if (
    batch.index.byteCount + indexByteCount < PRIMITIVE_BATCH_CAP_IN_BYTES &&
    batch.vertex.byteCount + vertexByteCount < PRIMITIVE_BATCH_CAP_IN_BYTES
  ) {
    return;
  }

  draw(context, {
    indicesCount: batch.index.count,
    startIndex: 0,
    indexBuffer: batch.index.buffer,
    vertexBuffers: [batch.vertex.buffer],
  });

  batch.index.byteCount = 0;
  batch.vertex.byteCount = 0;
  batch.index.count = 0;
  batch.vertex.count = 0;
};

const drawLines = (app: App) => {
  const { buffers, context, pipelines, primitiveContext } = app;

  const batch = createBatch(buffers.primitiveVertex, buffers.primitiveIndex);

  const linePrimitives = primitiveContext.primitives.filter(
    primitive => primitive.type === "LINE_SEGMENT"
  );

  setPipeline(context, pipelines.line);
  const bytesPerIndex = pipelines.line.inputAssembly.bytesPerIndex;
  const bytesPerVertex = getBytesPerVertex(pipelines.line.vertexLayout, 0);

  for (const primitive of linePrimitives) {
    const indexCount = getIndexCount(primitive);
    const vertexCount = getVertexCount(primitive);
    const indexByteCount = bytesPerIndex * indexCount;
    const vertexByteCount = bytesPerVertex * vertexCount;

    drawBatchIfFull(context, batch, indexByteCount, vertexByteCount);

    const indexBuffer = new ArrayBuffer(indexByteCount);
    const vertexBuffer = new ArrayBuffer(vertexByteCount);

    switch (primitive.type) {
      case "LINE_SEGMENT":
        batchLineSegment(
          vertexBuffer,
          indexBuffer,
          primitive,
          batch.vertex.count
        );
        break;
    }

    updateBuffer(context, {
      buffer: batch.vertex.buffer,
      content: vertexBuffer,
      offsetInBytes: batch.vertex.byteCount,
    });

    updateBuffer(context, {
      buffer: batch.index.buffer,
      content: indexBuffer,
      offsetInBytes: batch.index.byteCount,
    });

    batch.index.byteCount += indexByteCount;
    batch.vertex.byteCount += vertexByteCount;

    batch.index.count += indexCount;
    batch.vertex.count += vertexCount;
  }

  completeBatch(context, batch);
};

const drawSurfaces = (app: App) => {
  const { buffers, context, pipelines, primitiveContext } = app;

  const batch = createBatch(buffers.primitiveVertex, buffers.primitiveIndex);

  const surfacePrimitives = primitiveContext.primitives.filter(
    primitive => primitive.type === "SPHERE"
  );

  setPipeline(context, pipelines.surface);
  const bytesPerIndex = pipelines.surface.inputAssembly.bytesPerIndex;
  const bytesPerVertex = getBytesPerVertex(pipelines.surface.vertexLayout, 0);

  for (const primitive of surfacePrimitives) {
    const indexCount = getIndexCount(primitive);
    const vertexCount = getVertexCount(primitive);
    const vertexByteCount = bytesPerVertex * vertexCount;
    const indexByteCount = bytesPerIndex * indexCount;

    drawBatchIfFull(context, batch, indexByteCount, vertexByteCount);

    const indexBuffer = new ArrayBuffer(indexByteCount);
    const vertexBuffer = new ArrayBuffer(vertexByteCount);

    switch (primitive.type) {
      case "SPHERE":
        batchSphereVertices(vertexBuffer, primitive);
        batchSphereIndices(indexBuffer, batch.vertex.count);
        break;
    }

    updateBuffer(context, {
      buffer: batch.vertex.buffer,
      content: vertexBuffer,
      offsetInBytes: batch.vertex.byteCount,
    });

    updateBuffer(context, {
      buffer: batch.index.buffer,
      content: indexBuffer,
      offsetInBytes: batch.index.byteCount,
    });

    batch.index.byteCount += indexByteCount;
    batch.vertex.byteCount += vertexByteCount;

    batch.index.count += indexCount;
    batch.vertex.count += vertexCount;
  }

  completeBatch(context, batch);
};
