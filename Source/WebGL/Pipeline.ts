import { ShaderProgram } from "./ShaderProgram";
import { GloContext } from "./GloContext";

export type IndexType = "NONE" | "UINT16" | "UINT32";

export interface InputAssembly {
  indexType: GLenum | null;
  primitiveTopology: GLenum;
}

export interface InputAssemblySpec {
  indexType: IndexType;
  primitiveTopology: PrimitiveTopology;
}

export interface Pipeline {
  inputAssembly: InputAssembly;
  shader: ShaderProgram;
  vertexLayout: VertexLayout;
}

export interface PipelineSpec {
  inputAssembly: InputAssemblySpec;
  shader: ShaderProgram;
  vertexLayout: VertexLayoutSpec;
}

export type PrimitiveTopology = "LINE_LIST" | "TRIANGLE_LIST";

export interface VertexAttribute {
  bufferIndex: number;
  componentCount: number;
  isNormalized: boolean;
  location: GLint;
  offset: number;
  stride: number;
  type: GLenum;
}

export interface VertexAttributeSpec {
  bufferIndex: number;
  format: VertexFormat;
  name: string;
}

export type VertexFormat =
  | "FLOAT1"
  | "FLOAT2"
  | "FLOAT3"
  | "FLOAT4"
  | "UBYTE4_NORM"
  | "USHORT2_NORM";

export interface VertexLayout {
  attributes: VertexAttribute[];
}

export interface VertexLayoutSpec {
  attributes: VertexAttributeSpec[];
}

export const createPipeline = (
  context: GloContext,
  spec: PipelineSpec
): Pipeline => {
  const { shader } = spec;
  const inputAssembly = createInputAssembly(context, spec.inputAssembly);
  const vertexLayout = createVertexLayout(context, spec.vertexLayout, shader);
  return {
    inputAssembly,
    shader,
    vertexLayout,
  };
};

export const setPipeline = (context: GloContext, pipeline: Pipeline): void => {
  const { gl, state } = context;
  gl.useProgram(pipeline.shader.handle);
  state.pipeline = pipeline;
};

const createInputAssembly = (
  context: GloContext,
  spec: InputAssemblySpec
): InputAssembly => {
  const { indexType, primitiveTopology } = spec;
  return {
    indexType: getIndexType(context, indexType),
    primitiveTopology: getPrimitiveTopology(context, primitiveTopology),
  };
};

const createVertexLayout = (
  context: GloContext,
  spec: VertexLayoutSpec,
  program: ShaderProgram
): VertexLayout => {
  const offsetByBufferIndex = new Map<number, number>();

  const attributes = spec.attributes
    .map(attribute => {
      const { bufferIndex, format, name } = attribute;

      if (!offsetByBufferIndex.has(bufferIndex)) {
        offsetByBufferIndex.set(bufferIndex, 0);
      }
      const offset = offsetByBufferIndex.get(bufferIndex);
      offsetByBufferIndex.set(
        bufferIndex,
        offset + getVertexFormatSize(format)
      );

      const location = program.attributeLocations.get(name);
      if (location === undefined) {
        throw new Error(
          `Attribute ${name} was not found in the specified shader.`
        );
      }

      return {
        bufferIndex,
        componentCount: getVertexFormatComponentCount(format),
        isNormalized: getVertexFormatIsNormalized(format),
        location,
        offset,
        type: getVertexFormatType(context, format),
      };
    })
    .map(attribute => {
      return {
        ...attribute,
        stride: offsetByBufferIndex.get(attribute.bufferIndex),
      };
    });

  return {
    attributes,
  };
};

const getIndexType = (
  context: GloContext,
  indexType: IndexType
): GLenum | null => {
  const { gl } = context;
  switch (indexType) {
    case "NONE":
      return null;
    case "UINT16":
      return gl.UNSIGNED_SHORT;
    case "UINT32":
      return gl.UNSIGNED_INT;
    default:
      throw new Error(`Index type of ${indexType} is unknown.`);
  }
};

const getPrimitiveTopology = (
  context: GloContext,
  primitiveTopology: PrimitiveTopology
): GLenum => {
  const { gl } = context;
  switch (primitiveTopology) {
    case "LINE_LIST":
      return gl.LINES;
    case "TRIANGLE_LIST":
      return gl.TRIANGLES;
    default:
      throw new Error(
        `Primitive topology of type ${primitiveTopology} is unknown.`
      );
  }
};

const getVertexFormatComponentCount = (vertexFormat: VertexFormat): number => {
  switch (vertexFormat) {
    case "FLOAT1":
      return 1;
    case "FLOAT2":
      return 2;
    case "FLOAT3":
      return 3;
    case "FLOAT4":
      return 4;
    case "UBYTE4_NORM":
      return 4;
    case "USHORT2_NORM":
      return 2;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};

const getVertexFormatIsNormalized = (vertexFormat: VertexFormat): boolean => {
  switch (vertexFormat) {
    case "FLOAT1":
    case "FLOAT2":
    case "FLOAT3":
    case "FLOAT4":
      return false;
    case "UBYTE4_NORM":
    case "USHORT2_NORM":
      return true;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};

const getVertexFormatSize = (vertexFormat: VertexFormat): number => {
  switch (vertexFormat) {
    case "FLOAT1":
      return 4;
    case "FLOAT2":
      return 8;
    case "FLOAT3":
      return 12;
    case "FLOAT4":
      return 16;
    case "UBYTE4_NORM":
      return 4;
    case "USHORT2_NORM":
      return 4;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};

const getVertexFormatType = (
  context: GloContext,
  vertexFormat: VertexFormat
): GLenum => {
  const { gl } = context;
  switch (vertexFormat) {
    case "FLOAT1":
    case "FLOAT2":
    case "FLOAT3":
    case "FLOAT4":
      return gl.FLOAT;
    case "UBYTE4_NORM":
      return gl.UNSIGNED_BYTE;
    case "USHORT2_NORM":
      return gl.UNSIGNED_SHORT;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};
