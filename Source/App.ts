import { Color } from "./Color";
import { GloBuffer, createBuffer, updateBuffer } from "./WebGL/GloBuffer";
import { clearTarget, GloContext, draw } from "./WebGL/GloContext";
import { Pipeline, createPipeline, setPipeline } from "./WebGL/Pipeline";
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
} from "./Primitive";

const PRIMITIVE_BATCH_CAP_IN_BYTES = 16 * 1000;

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
  buffer: GloBuffer;
  byteCount: number;
  elementCount: number;
}

interface BufferSet {
  primitive: GloBuffer;
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

  const primitive = createBuffer(context, {
    byteCount: PRIMITIVE_BATCH_CAP_IN_BYTES,
    format: "VERTEX_BUFFER",
    usage: "DYNAMIC",
  });

  return {
    primitive,
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
      indexType: "NONE",
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
    style: { color: new Color([1, 0, 0]) },
  });
  addAxisIndicator(primitiveContext);

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
  const xAxis = Point3.add(origin, Vector3.unitX());
  const yAxis = Point3.add(origin, Vector3.unitY());
  const zAxis = Point3.add(origin, Vector3.unitZ());
  addLineSegment(context, {
    endpoints: [origin, xAxis],
    style: { color: Color.fromHexString("ff0000") },
  });
  addLineSegment(context, {
    endpoints: [origin, yAxis],
    style: { color: Color.fromHexString("00ff00") },
  });
  addLineSegment(context, {
    endpoints: [origin, zAxis],
    style: { color: Color.fromHexString("0000ff") },
  });
};

const batchLineSegment = (
  context: GloContext,
  batch: Batch,
  lineSegment: LineSegment
) => {
  const { endpoints, style } = lineSegment;

  const componentCount = 4;
  const stride = 4 * componentCount;
  const elementCount = endpoints.length;
  const byteCount = stride * elementCount;
  const content = new ArrayBuffer(byteCount);
  const floatView = new Float32Array(content);
  const uint32View = new Uint32Array(content);
  for (let i = 0; i < elementCount; i++) {
    const endpoint = endpoints[i];
    for (let j = 0; j < endpoint.elements.length; j++) {
      floatView[componentCount * i + j] = endpoint.elements[j];
    }
    uint32View[componentCount * i + 3] = Color.toRgbaInteger(style.color);
  }

  updateBuffer(context, {
    buffer: batch.buffer,
    content,
    offsetInBytes: batch.byteCount,
  });

  batch.byteCount += byteCount;
  batch.elementCount += elementCount;
};

const drawPrimitives = (app: App) => {
  const { buffers, context, pipelines, primitiveContext } = app;

  const batch = {
    buffer: buffers.primitive,
    byteCount: 0,
    elementCount: 0,
  };

  const bytesPerVertex = 16;

  setPipeline(context, pipelines.line);

  for (const primitive of primitiveContext.primitives) {
    const byteCount = bytesPerVertex * getVertexCount(primitive);

    if (batch.byteCount + byteCount >= PRIMITIVE_BATCH_CAP_IN_BYTES) {
      draw(context, {
        indicesCount: batch.elementCount,
        startIndex: 0,
        vertexBuffers: [batch.buffer],
      });

      batch.byteCount = 0;
      batch.elementCount = 0;
    }

    switch (primitive.type) {
      case "LINE_SEGMENT":
        batchLineSegment(context, batch, primitive);
        break;
    }
  }

  if (batch.elementCount > 0) {
    draw(context, {
      indicesCount: batch.elementCount,
      startIndex: 0,
      vertexBuffers: [batch.buffer],
    });
  }
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
