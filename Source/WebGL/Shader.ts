import { GloContext } from "./GloContext";

export type ShaderType = "PIXEL" | "VERTEX";

export interface Shader {
  handle: WebGLShader;
}

export interface ShaderSpec {
  source: string;
  type: ShaderType;
}

export const createShader = (context: GloContext, spec: ShaderSpec): Shader => {
  const { gl } = context;
  const { source, type } = spec;

  const shaderType = getShaderType(context, type);
  const shader = gl.createShader(shaderType);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader);
    throw new Error("Failed to compile shader: " + infoLog);
  }

  return {
    handle: shader,
  };
};

const getShaderType = (context: GloContext, shaderType: ShaderType): GLenum => {
  const { gl } = context;
  switch (shaderType) {
    case "PIXEL":
      return gl.FRAGMENT_SHADER;
    case "VERTEX":
      return gl.VERTEX_SHADER;
    default:
      throw new Error(`Shader type ${shaderType} is unknown.`);
  }
};
