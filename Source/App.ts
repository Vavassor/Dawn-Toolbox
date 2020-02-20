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

export interface App {
  buffers: BufferSet;
  context: GloContext;
  pipelines: PipelineSet;
  programs: ShaderProgramSet;
}

interface BufferSet {
  test: GloBuffer;
}

interface PipelineSet {
  test: Pipeline;
}

interface ShaderProgramSet {
  basic: ShaderProgram;
}

export const createApp = (context: GloContext): App => {
  const programs = createShaderProgramSet(context);
  return {
    buffers: createBufferSet(context),
    context,
    pipelines: createPipelineSet(context, programs),
    programs,
  };
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

  setPipeline(context, pipelines.test);

  setUniformMatrix4fv(
    context,
    programs.basic,
    "model_view_projection",
    Matrix4.toFloat32Array(Matrix4.identity())
  );

  draw(context, {
    indicesCount: 3,
    startIndex: 0,
    vertexBuffers: [buffers.test],
  });
};
