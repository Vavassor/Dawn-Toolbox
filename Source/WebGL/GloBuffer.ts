import { GloContext } from "./GloContext";

export type BufferFormat = "INDEX_BUFFER" | "VERTEX_BUFFER";

export interface BufferSpec {
  content: ArrayBufferView | ArrayBuffer | null;
  format: BufferFormat;
  usage: BufferUsage;
}

export type BufferUsage = "DYNAMIC" | "STATIC";

export interface GloBuffer {
  format: GLenum;
  handle: WebGLBuffer;
}

export const createBuffer = (
  context: GloContext,
  spec: BufferSpec
): GloBuffer => {
  const { gl } = context;
  const { content } = spec;
  const usage = getBufferUsage(context, spec.usage);
  const format = getBufferFormat(context, spec.format);

  const buffer = gl.createBuffer();
  gl.bindBuffer(format, buffer);
  gl.bufferData(format, content, usage);

  return {
    format,
    handle: buffer,
  };
};

const getBufferFormat = (
  context: GloContext,
  bufferFormat: BufferFormat
): GLenum => {
  const { gl } = context;
  switch (bufferFormat) {
    case "INDEX_BUFFER":
      return gl.ELEMENT_ARRAY_BUFFER;
    case "VERTEX_BUFFER":
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
    case "DYNAMIC":
      return gl.DYNAMIC_DRAW;
    case "STATIC":
      return gl.STATIC_DRAW;
    default:
      throw new Error(`Buffer usage value of ${bufferUsage} is unknown.`);
  }
};
