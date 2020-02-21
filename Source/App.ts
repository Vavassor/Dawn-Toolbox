import { Color } from "./Color";
import { GloBuffer, createBuffer } from "./WebGL/GloBuffer";
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

export interface App {
  buffers: BufferSet;
  canvasSize: Size2;
  context: GloContext;
  handleMouseMove?: HandleMouseMove;
  pipelines: PipelineSet;
  programs: ShaderProgramSet;
}

interface BufferSet {
  test: GloBuffer;
}

export type HandleMouseMove = (event: MouseEvent) => void;

interface PipelineSet {
  test: Pipeline;
}

interface ShaderProgramSet {
  basic: ShaderProgram;
}

export const createApp = (
  context: GloContext,
  initialCanvasSize: Size2
): App => {
  const programs = createShaderProgramSet(context);
  return {
    buffers: createBufferSet(context),
    canvasSize: initialCanvasSize,
    context,
    pipelines: createPipelineSet(context, programs),
    programs,
  };
};

export const handleMouseMoveWithApp = (event: MouseEvent, app: App) => {

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

  const buffer = createBuffer(context, {
    content: arrayBuffer,
    format: "VERTEX_BUFFER",
    usage: "STATIC",
  });

  return {
    test: buffer,
  };
};

const createPipelineSet = (
  context: GloContext,
  programs: ShaderProgramSet
): PipelineSet => {
  const pipeline = createPipeline(context, {
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
    test: pipeline,
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
  const { buffers, context, pipelines, programs } = app;

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
    nearPlane: -1,
    width: app.canvasSize.width,
  });

  setPipeline(context, pipelines.test);

  const view = Matrix4.lookAtRh(
    new Point3([0, -1, 1]),
    Point3.zero(),
    Vector3.unitZ()
  );
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
    Matrix4.toFloat32Array(modelViewProjection)
  );

  draw(context, {
    indicesCount: 3,
    startIndex: 0,
    vertexBuffers: [buffers.test],
  });
};
