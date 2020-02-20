import { Color } from "../Color";
import { Pipeline } from "./Pipeline";
import { GloBuffer } from "./GloBuffer";

export interface ClearAction {
  color?: ClearColorAction;
  depth?: ClearDepthAction;
  stencil?: ClearStencilAction;
}

export interface ClearColorAction {
  shouldClear: boolean;
  value?: Color;
}

export interface ClearDepthAction {
  shouldClear: boolean;
  value?: number;
}

export interface ClearState {
  color: Color;
  depth: number;
  stencil: number;
}

export interface ClearStencilAction {
  shouldClear: boolean;
  value?: number;
}

export interface DrawAction {
  indexBuffer?: GloBuffer;
  indicesCount: number;
  startIndex: number;
  vertexBuffers: GloBuffer[];
}

export interface Extensions {
  depthTexture: WEBGL_depth_texture;
  drawBuffers: WEBGL_draw_buffers;
  floatTexture: OES_texture_float;
}

export interface GloContext {
  extensions: Extensions;
  gl: WebGLRenderingContext;
  state: {
    clear: ClearState;
    pipeline: Pipeline | null;
  };
}

export const clearTarget = (context: GloContext, action: ClearAction) => {
  const { gl } = context;
  const clearState = context.state.clear;
  let mask = 0;
  const { color, depth, stencil } = action;
  if (color) {
    const value = color.value;
    if (value && !Color.isExactlyEqual(value, clearState.color)) {
      gl.clearColor(value.r, value.g, value.b, value.a);
      clearState.color = value;
    }
    mask |= gl.COLOR_BUFFER_BIT;
  }
  if (depth) {
    const value = depth.value;
    if (value && value !== clearState.depth) {
      gl.clearDepth(value);
      clearState.depth = value;
    }
    mask |= gl.DEPTH_BUFFER_BIT;
  }
  if (stencil) {
    const value = stencil.value;
    if (value && value !== clearState.stencil) {
      gl.clearStencil(value);
      clearState.stencil = value;
    }
    mask |= gl.STENCIL_BUFFER_BIT;
  }
  gl.clear(mask);
};

export const createContext = (canvas: HTMLCanvasElement): GloContext => {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    throw new Error("WebGL context could not be created.");
  }
  return {
    extensions: createExtensions(gl),
    gl,
    state: {
      clear: {
        color: Color.transparentBlack(),
        depth: 1,
        stencil: 0,
      },
      pipeline: null,
    },
  };
};

export const draw = (context: GloContext, action: DrawAction) => {
  const { gl } = context;
  const { pipeline } = context.state;
  if (!pipeline) {
    throw new Error("No pipeline set before a draw.");
  }

  const { indexType, primitiveTopology } = pipeline.inputAssembly;
  const { attributes } = pipeline.vertexLayout;
  const { indexBuffer, indicesCount, vertexBuffers } = action;

  for (const attribute of attributes) {
    const {
      componentCount,
      isNormalized,
      location,
      offset,
      stride,
      type,
    } = attribute;
    const buffer = vertexBuffers[attribute.bufferIndex];
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.handle);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      componentCount,
      type,
      isNormalized,
      stride,
      offset
    );
  }

  if (indexType === null) {
    gl.drawArrays(primitiveTopology, 0, indicesCount);
  } else {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.handle);
    gl.drawElements(primitiveTopology, indicesCount, indexType, 0);
  }
};

const createExtensions = (gl: WebGLRenderingContext): Extensions => {
  const depthTextureExtension = gl.getExtension("WEBGL_depth_texture");
  if (!depthTextureExtension) {
    throw new Error(
      "The WebGL extension WEBGL_depth_texture is not supported."
    );
  }

  const drawBuffersExtension = gl.getExtension("WEBGL_draw_buffers");
  if (!drawBuffersExtension) {
    throw new Error(`The WebGL extension WEBGL_draw_buffers is not supported.`);
  }

  const floatTextureExtension = gl.getExtension("OES_texture_float");
  if (!floatTextureExtension) {
    throw new Error("The WebGL extension OES_texture_float is not supported.");
  }

  return {
    depthTexture: depthTextureExtension,
    drawBuffers: drawBuffersExtension,
    floatTexture: floatTextureExtension,
  };
};
