import { GloContext } from "./GloContext";

export enum BufferFormat {
  IndexBuffer,
  VertexBuffer,
}

export type BufferSpec = BufferSpecContent | BufferSpecEmpty;

interface BufferSpecBase {
  format: BufferFormat;
  usage: BufferUsage;
}

interface BufferSpecContent extends BufferSpecBase {
  content: ArrayBufferView | ArrayBuffer;
}

interface BufferSpecEmpty extends BufferSpecBase {
  byteCount: number;
}

export interface BufferUpdate {
  buffer: GloBuffer;
  content: ArrayBufferView | ArrayBuffer;
  offsetInBytes: number;
}

export enum BufferUsage {
  Dynamic,
  Static,
}

export interface GloBuffer {
  format: GLenum;
  handle: WebGLBuffer;
}

export const createBuffer = (
  context: GloContext,
  spec: BufferSpec
): GloBuffer => {
  const { gl } = context;
  const usage = getBufferUsage(context, spec.usage);
  const format = getBufferFormat(context, spec.format);

  const buffer = gl.createBuffer();
  gl.bindBuffer(format, buffer);
  if ("content" in spec) {
    gl.bufferData(format, spec.content, usage);
  } else {
    gl.bufferData(format, spec.byteCount, usage);
  }

  return {
    format,
    handle: buffer,
  };
};

export const updateBuffer = (context: GloContext, update: BufferUpdate) => {
  const { gl } = context;
  const { buffer, offsetInBytes, content } = update;
  const { format, handle } = buffer;
  gl.bindBuffer(format, handle);
  gl.bufferSubData(format, offsetInBytes, content);
};

const getBufferFormat = (
  context: GloContext,
  bufferFormat: BufferFormat
): GLenum => {
  const { gl } = context;
  switch (bufferFormat) {
    case BufferFormat.IndexBuffer:
      return gl.ELEMENT_ARRAY_BUFFER;
    case BufferFormat.VertexBuffer:
      return gl.ARRAY_BUFFER;
    default:
      throw new Error(`Buffer format value of ${bufferFormat} is unknown.`);
  }
};

const getBufferUsage = (
  context: GloContext,
  bufferUsage: BufferUsage
): GLenum => {
  const { gl } = context;
  switch (bufferUsage) {
    case BufferUsage.Dynamic:
      return gl.DYNAMIC_DRAW;
    case BufferUsage.Static:
      return gl.STATIC_DRAW;
    default:
      throw new Error(`Buffer usage value of ${bufferUsage} is unknown.`);
  }
};
