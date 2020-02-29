import { GloContext } from "./GloContext";
import { Shader } from "./Shader";

export interface ShaderProgram {
  attributeLocations: Map<string, GLint>;
  handle: WebGLProgram;
  uniformLocations: Map<string, WebGLUniformLocation>;
}

export interface ShaderProgramSpec {
  shaders: {
    pixel: Shader;
    vertex: Shader;
  };
  uniforms: string[];
  vertexLayout: ShaderVertexLayoutSpec;
}

export interface ShaderVertexAttributeSpec {
  name: string;
}

export interface ShaderVertexLayoutSpec {
  attributes: ShaderVertexAttributeSpec[];
}

export const createShaderProgram = (
  context: GloContext,
  spec: ShaderProgramSpec
): ShaderProgram => {
  const pixelShader = spec.shaders.pixel;
  const vertexShader = spec.shaders.vertex;

  const handle = createAndLinkProgram(
    context,
    vertexShader.handle,
    pixelShader.handle
  );
  const attributeLocations = getAttributeLocations(
    context,
    handle,
    spec.vertexLayout
  );
  const uniformLocations = getUniformLocations(context, handle, spec.uniforms);

  return {
    attributeLocations,
    handle,
    uniformLocations,
  };
};

export const setUniform1f = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: number
): void => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniform1f(uniformLocations.get(name), value);
};

export const setUniform1i = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: number
): void => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniform1i(uniformLocations.get(name), value);
};

export const setUniform3fv = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: Float32List
) => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniform3fv(uniformLocations.get(name), value);
};

export const setUniform4fv = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: Float32List
) => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniform4fv(uniformLocations.get(name), value);
};

export const setUniformMatrix3fv = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: Float32List
) => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniformMatrix3fv(uniformLocations.get(name), false, value);
};

export const setUniformMatrix4fv = (
  context: GloContext,
  program: ShaderProgram,
  name: string,
  value: Float32List
) => {
  const { gl } = context;
  const { uniformLocations } = program;
  gl.uniformMatrix4fv(uniformLocations.get(name), false, value);
};

const createAndLinkProgram = (
  context: GloContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram => {
  const { gl } = context;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program);
    throw new Error("Failed to link program: " + infoLog);
  }

  return program;
};

const getAttributeLocations = (
  context: GloContext,
  handle: WebGLProgram,
  vertexLayout: ShaderVertexLayoutSpec
): Map<string, GLint> => {
  const { gl } = context;
  const attributeLocationsByName = new Map<string, GLint>();
  for (const attribute of vertexLayout.attributes) {
    const { name } = attribute;
    const location = gl.getAttribLocation(handle, name);
    if (location === -1) {
      throw new Error(`The location of attribute ${name} was not found.`);
    }
    attributeLocationsByName.set(name, location);
  }
  return attributeLocationsByName;
};

const getUniformLocations = (
  context: GloContext,
  handle: WebGLProgram,
  uniformNames: string[]
): Map<string, WebGLUniformLocation> => {
  const { gl } = context;
  const uniformLocations = new Map<string, WebGLUniformLocation>();
  for (const uniformName of uniformNames) {
    const location = gl.getUniformLocation(handle, uniformName);
    if (!location) {
      throw new Error(`The location of uniform ${uniformName} was not found.`);
    }
    uniformLocations.set(uniformName, location);
  }
  return uniformLocations;
};
