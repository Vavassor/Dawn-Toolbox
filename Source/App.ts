import { Color } from "./Color";
import { GloBuffer, createBuffer, updateBuffer } from "./WebGL/GloBuffer";
import { clearTarget, GloContext, draw } from "./WebGL/GloContext";
import {
  Pipeline,
  createPipeline,
  setPipeline,
  getBytesPerVertex,
} from "./WebGL/Pipeline";
import { createShader } from "./WebGL/Shader";
import {
  createShaderProgram,
  ShaderProgram,
  setUniformMatrix4fv,
} from "./WebGL/ShaderProgram";
import pixelSource from "./Shaders/basic.ps.glsl";
import vertexSource from "./Shaders/basic.vs.glsl";
import { Matrix4 } from "./Geometry/Matrix4";
import { setViewport } from "./WebGL/Viewport";
import { Size2 } from "./Size2";
import { Point3 } from "./Geometry/Point3";
import { Vector3 } from "./Geometry/Vector3";
import { Vector2 } from "./Geometry/Vector2";
import { clamp } from "./Clamp";
import {
  createInputState,
  InputState,
  KeyMapping,
  updateInput,
  getAxis2d,
} from "./Input";
import {
  addLineSegment,
  createPrimitiveContext,
  LineSegment,
  PrimitiveContext,
  resetPrimitives,
  getVertexCount,
  addSphere,
  Sphere,
  getIndexCount,
} from "./Primitive";
import { COLORS } from "./Colors";

const PRIMITIVE_BATCH_CAP_IN_BYTES = 1024;

export interface App {
  buffers: BufferSet;
  camera: Camera;
  canvasSize: Size2;
  context: GloContext;
  handleMouseMove?: HandleMouseMove;
  input: InputState;
  pipelines: PipelineSet;
  primitiveContext: PrimitiveContext;
  programs: ShaderProgramSet;
}

interface Batch {
  index: {
    buffer: GloBuffer;
    byteCount: number;
  };
  indexCount: number;
  vertex: {
    buffer: GloBuffer;
    byteCount: number;
  };
}

interface BufferSet {
  primitiveIndex: GloBuffer;
  primitiveVertex: GloBuffer;
  test: GloBuffer;
}

interface Camera {
  pitch: number;
  position: Point3;
  yaw: number;
}

export type HandleMouseMove = (event: MouseEvent) => void;

interface PipelineSet {
  line: Pipeline;
  surface: Pipeline;
  test: Pipeline;
}

interface ShaderProgramSet {
  basic: ShaderProgram;
}

export const createApp = (
  context: GloContext,
  initialCanvasSize: Size2
): App => {
  const keyMappings = createKeyMappings();
  const programs = createShaderProgramSet(context);
  return {
    buffers: createBufferSet(context),
    camera: {
      pitch: 0,
      position: new Point3([0, 0, 1]),
      yaw: 0,
    },
    canvasSize: initialCanvasSize,
    context,
    input: createInputState(keyMappings),
    pipelines: createPipelineSet(context, programs),
    primitiveContext: createPrimitiveContext(),
    programs,
  };
};

export const handleResize = (event: UIEvent, app: App): any => {
  const height = window.innerHeight;
  const width = window.innerWidth;
  console.log(`resize event: ${width}x${height}`);
};

const createBufferSet = (context: GloContext): BufferSet => {
  const arrayBuffer = new ArrayBuffer(16 * 3);
  const floatView = new Float32Array(arrayBuffer);
  const uint32View = new Uint32Array(arrayBuffer);
  floatView[0] = 0;
  floatView[1] = 0.5;
  floatView[2] = 0;
  uint32View[3] = 0xff0000ff;
  floatView[4] = -0.5;
  floatView[5] = -0.5;
  floatView[6] = 0;
  uint32View[7] = 0xff00ff00;
  floatView[8] = 0.5;
  floatView[9] = -0.5;
  floatView[10] = 0;
  uint32View[11] = 0xffff0000;

  const test = createBuffer(context, {
    content: arrayBuffer,
    format: "VERTEX_BUFFER",
    usage: "STATIC",
  });

  const primitiveIndex = createBuffer(context, {
    byteCount: PRIMITIVE_BATCH_CAP_IN_BYTES,
    format: "INDEX_BUFFER",
    usage: "DYNAMIC",
  });

  const primitiveVertex = createBuffer(context, {
    byteCount: PRIMITIVE_BATCH_CAP_IN_BYTES,
    format: "VERTEX_BUFFER",
    usage: "DYNAMIC",
  });

  return {
    primitiveVertex,
    primitiveIndex,
    test,
  };
};

const createKeyMappings = (): KeyMapping[] => {
  return [
    {
      action: "MOVE",
      direction: "POSITIVE_Y",
      key: "w",
      type: "AXIS_2D",
    },
    {
      action: "MOVE",
      direction: "NEGATIVE_Y",
      key: "s",
      type: "AXIS_2D",
    },
    {
      action: "MOVE",
      direction: "POSITIVE_X",
      key: "d",
      type: "AXIS_2D",
    },
    {
      action: "MOVE",
      direction: "NEGATIVE_X",
      key: "a",
      type: "AXIS_2D",
    },
  ];
};

const createPipelineSet = (
  context: GloContext,
  programs: ShaderProgramSet
): PipelineSet => {
  const line = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "UINT16",
      primitiveTopology: "LINE_LIST",
    },
    shader: programs.basic,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  const surface = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "UINT16",
      primitiveTopology: "TRIANGLE_LIST",
    },
    shader: programs.basic,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  const test = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "NONE",
      primitiveTopology: "TRIANGLE_LIST",
    },
    shader: programs.basic,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  return {
    line,
    surface,
    test,
  };
};

const createShaderProgramSet = (context: GloContext): ShaderProgramSet => {
  const vertexShader = createShader(context, {
    source: vertexSource,
    type: "VERTEX",
  });

  const pixelShader = createShader(context, {
    source: pixelSource,
    type: "PIXEL",
  });

  const basicProgram = createShaderProgram(context, {
    shaders: {
      pixel: pixelShader,
      vertex: vertexShader,
    },
    uniforms: ["model_view_projection"],
    vertexLayout: {
      attributes: [{ name: "vertex_position" }, { name: "vertex_color" }],
    },
  });

  return {
    basic: basicProgram,
  };
};

export const updateFrame = (app: App) => {
  const {
    buffers,
    camera,
    context,
    input,
    pipelines,
    primitiveContext,
    programs,
  } = app;

  updateInput(input);
  updateCamera(camera, input);
  resetPrimitives(primitiveContext);

  addLineSegment(primitiveContext, {
    endpoints: [new Point3([1, 0, -1]), new Point3([0, 1, 1])],
    style: { color: COLORS.white },
  });
  addAxisIndicator(primitiveContext);
  addSphere(primitiveContext, {
    center: new Point3([2, 2, 1]),
    radius: 1,
    style: { color: COLORS.white },
  });
  addSphere(primitiveContext, {
    center: new Point3([-2, 2, -1]),
    radius: 1,
    style: { color: COLORS.white },
  });

  clearTarget(context, {
    color: {
      shouldClear: true,
      value: Color.opaqueBlack(),
    },
  });

  setViewport(context, {
    bottomLeftX: 0,
    bottomLeftY: 0,
    farPlane: 1,
    height: app.canvasSize.height,
    nearPlane: 0,
    width: app.canvasSize.width,
  });

  setPipeline(context, pipelines.test);

  const { position, pitch, yaw } = camera;
  const view = Matrix4.turnRh(position, yaw, pitch, Vector3.unitZ());
  const projection = Matrix4.perspective(
    Math.PI / 2,
    app.canvasSize.width,
    app.canvasSize.height,
    0.001,
    100
  );
  const modelViewProjection = Matrix4.multiply(projection, view);

  setUniformMatrix4fv(
    context,
    programs.basic,
    "model_view_projection",
    Matrix4.toFloat32Array(Matrix4.transpose(modelViewProjection))
  );

  draw(context, {
    indicesCount: 3,
    startIndex: 0,
    vertexBuffers: [buffers.test],
  });

  drawPrimitives(app);
};

const addAxisIndicator = (context: PrimitiveContext) => {
  const origin = Point3.zero();
  const xAxis = Point3.fromVector3(Vector3.unitX());
  const yAxis = Point3.fromVector3(Vector3.unitY());
  const zAxis = Point3.fromVector3(Vector3.unitZ());
  addLineSegment(context, {
    endpoints: [origin, xAxis],
    style: { color: COLORS.orange },
  });
  addLineSegment(context, {
    endpoints: [origin, yAxis],
    style: { color: COLORS.lightGreen },
  });
  addLineSegment(context, {
    endpoints: [origin, zAxis],
    style: { color: COLORS.blue },
  });
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
    uint16View[writeIndex + 1] = i + southCapParallel;
    uint16View[writeIndex + 2] = ((i + 1) % meridianCount) + southCapParallel;
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

  const componentCount = 4;
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
  batchVertex(floatView, uint32View, 0, northPole, color);

  const southPole = Point3.add(
    center,
    Vector3.multiply(-radius, Vector3.unitZ())
  );
  batchVertex(floatView, uint32View, componentCount, southPole, color);

  const indexAfterPoles = 2 * componentCount;

  for (let parallel = 0; parallel < parallelCount; parallel++) {
    const inclination = (parallel + 1) * deltaInclinationPerParallel;
    for (let meridian = 0; meridian < meridianCount; meridian++) {
      const azimuth = meridian * deltaAzimuthPerMeridian;
      const point = Point3.add(
        center,
        Vector3.fromSphericalCoordinates(radius, inclination, azimuth)
      );
      const pointIndex = meridianCount * parallel + meridian;
      const vertexIndex = componentCount * pointIndex + indexAfterPoles;
      batchVertex(floatView, uint32View, vertexIndex, point, color);
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

const completeBatch = (context: GloContext, batch: Batch) => {
  if (batch.indexCount === 0) {
    return;
  }

  draw(context, {
    indicesCount: batch.indexCount,
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
    indexCount: 0,
    index: {
      buffer: indexBuffer,
      byteCount: 0,
    },
    vertex: {
      buffer: vertexBuffer,
      byteCount: 0,
    },
  };
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
          batch.indexCount
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

    batch.indexCount += indexCount;
  }

  completeBatch(context, batch);
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
    indicesCount: batch.indexCount,
    startIndex: 0,
    indexBuffer: batch.index.buffer,
    vertexBuffers: [batch.vertex.buffer],
  });

  batch.index.byteCount = 0;
  batch.vertex.byteCount = 0;
  batch.indexCount = 0;
};

const drawPrimitives = (app: App) => {
  drawLines(app);
  drawSurfaces(app);
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
        batchSphereIndices(indexBuffer, batch.indexCount);
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

    batch.indexCount += indexCount;
  }

  completeBatch(context, batch);
};

const updateCamera = (camera: Camera, input: InputState) => {
  const { delta } = input.pointer;
  const horizontalPixelsPerRadian = 0.001;
  const moveSpeed = 0.1;
  const verticalPixelsPerRadian = 0.001;
  const deltaPitch = verticalPixelsPerRadian * delta.y;

  camera.pitch = clamp(camera.pitch - deltaPitch, -Math.PI / 2, Math.PI / 2);
  camera.yaw -= horizontalPixelsPerRadian * delta.x;

  const direction = Vector2.rotate(
    getAxis2d(input, "MOVE"),
    camera.yaw + Math.PI / 2
  );
  const velocity = Vector2.multiply(moveSpeed, direction);
  camera.position = Point3.add(camera.position, Vector3.fromVector2(velocity));
};
