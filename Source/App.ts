import { Color } from "./Color";
import { GloBuffer, createBuffer } from "./WebGL/GloBuffer";
import { clearTarget, GloContext, draw } from "./WebGL/GloContext";
import { Pipeline, createPipeline, setPipeline } from "./WebGL/Pipeline";
import { createShader } from "./WebGL/Shader";
import {
  createShaderProgram,
  ShaderProgram,
  setUniformMatrix4fv,
  setUniformMatrix3fv,
  setUniform3fv,
} from "./WebGL/ShaderProgram";
import basicPixelSource from "./Shaders/basic.ps.glsl";
import basicVertexSource from "./Shaders/basic.vs.glsl";
import litPixelSource from "./Shaders/lit.ps.glsl";
import litVertexSource from "./Shaders/lit.vs.glsl";
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
  PrimitiveContext,
  resetPrimitives,
  addSphere,
} from "./Primitive";
import { COLORS } from "./Colors";
import { drawPrimitives, PRIMITIVE_BATCH_CAP_IN_BYTES } from "./PrimitiveDraw";
import { Matrix3 } from "./Geometry/Matrix3";

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
  lit: ShaderProgram;
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
    shader: programs.lit,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "SBYTE4_NORM", name: "vertex_normal" },
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
  const basicVertexShader = createShader(context, {
    source: basicVertexSource,
    type: "VERTEX",
  });

  const basicPixelShader = createShader(context, {
    source: basicPixelSource,
    type: "PIXEL",
  });

  const litVertexShader = createShader(context, {
    source: litVertexSource,
    type: "VERTEX",
  });

  const litPixelShader = createShader(context, {
    source: litPixelSource,
    type: "PIXEL",
  });

  const basic = createShaderProgram(context, {
    shaders: {
      pixel: basicPixelShader,
      vertex: basicVertexShader,
    },
    uniforms: ["model_view_projection"],
    vertexLayout: {
      attributes: [{ name: "vertex_position" }, { name: "vertex_color" }],
    },
  });

  const lit = createShaderProgram(context, {
    shaders: {
      pixel: litPixelShader,
      vertex: litVertexShader,
    },
    uniforms: ["light_direction", "model_view_projection", "normal_transform"],
    vertexLayout: {
      attributes: [
        { name: "vertex_position" },
        { name: "vertex_normal" },
        { name: "vertex_color" },
      ],
    },
  });

  return {
    basic,
    lit,
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
  const model = Matrix4.identity();
  const view = Matrix4.turnRh(position, yaw, pitch, Vector3.unitZ());
  const projection = Matrix4.perspective(
    Math.PI / 2,
    app.canvasSize.width,
    app.canvasSize.height,
    0.001,
    100
  );
  const modelView = Matrix4.multiply(view, model);
  const modelViewProjection = Matrix4.multiply(projection, modelView);
  const normalTransform = Matrix3.fromMatrix4(
    Matrix4.transpose(Matrix4.inverse(modelView))
  );
  const lightDirection = new Vector3([-0.5345, -0.8018, -0.2673]);

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

  setPipeline(context, pipelines.surface);
  setUniform3fv(
    context,
    programs.lit,
    "light_direction",
    Vector3.toFloat32Array(
      Vector3.negate(Matrix4.transformVector3(view, lightDirection))
    )
  );
  setUniformMatrix4fv(
    context,
    programs.lit,
    "model_view_projection",
    Matrix4.toFloat32Array(Matrix4.transpose(modelViewProjection))
  );
  setUniformMatrix3fv(
    context,
    programs.lit,
    "normal_transform",
    Matrix3.toFloat32Array(Matrix3.transpose(normalTransform))
  );

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
