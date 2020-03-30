import { ShaderProgram } from "./ShaderProgram";
import { GloContext } from "./GloContext";

export type CompareOp =
  | "ALWAYS"
  | "EQUAL"
  | "GREATER"
  | "GREATER_OR_EQUAL"
  | "LESS"
  | "LESS_OR_EQUAL"
  | "NEVER"
  | "NOT_EQUAL";

export type CullMode = "BACK" | "FRONT" | "NONE";

export interface DepthStencilState {
  backStencil: StencilOpState;
  depthCompareOp: GLenum;
  frontStencil: StencilOpState;
  shouldCompareDepth: boolean;
  shouldWriteDepth: boolean;
  shouldUseStencil: boolean;
}

export type DepthStencilStateSpec =
  | DepthStencilStateSpecNoStencil
  | DepthStencilStateSpecWithStencil;

interface DepthStencilStateSpecNoStencil {
  depthCompareOp?: CompareOp;
  shouldCompareDepth: boolean;
  shouldWriteDepth: boolean;
  shouldUseStencil: false;
}

interface DepthStencilStateSpecWithStencil {
  backStencil: StencilOpStateSpec;
  depthCompareOp: CompareOp;
  frontStencil: StencilOpStateSpec;
  shouldCompareDepth: boolean;
  shouldWriteDepth: boolean;
  shouldUseStencil: true;
}

export type FaceWinding = "CLOCKWISE" | "COUNTERCLOCKWISE";

export type IndexType = "NONE" | "UINT16" | "UINT32";

export interface InputAssembly {
  bytesPerIndex: number;
  indexType: GLenum | null;
  primitiveTopology: GLenum;
}

export interface InputAssemblySpec {
  indexType: IndexType;
  primitiveTopology: PrimitiveTopology;
}

export interface Pipeline {
  depthStencil: DepthStencilState;
  inputAssembly: InputAssembly;
  rasterizer: RasterizerState;
  shader: ShaderProgram;
  vertexLayout: VertexLayout;
}

export interface PipelineSpec {
  depthStencil: DepthStencilStateSpec;
  inputAssembly: InputAssemblySpec;
  rasterizer?: RasterizerStateSpec;
  shader: ShaderProgram;
  vertexLayout: VertexLayoutSpec;
}

export type PrimitiveTopology = "LINE_LIST" | "TRIANGLE_LIST";

export interface RasterizerState {
  cullMode: GLenum;
  depthBias: RasterizerStateDepthBias;
  faceWinding: GLenum;
  shouldUseDepthBias: boolean;
}

interface RasterizerStateDepthBias {
  clamp: number;
  constant: number;
  slope: number;
}

interface RasterizerStateSpecDepthBias {
  clamp: number;
  constant: number;
  slope: number;
}

export type RasterizerStateSpec =
  | RasterizerStateSpecWithDepthBias
  | RasterizerStateSpecWithoutDepthBias;

interface RasterizerStateSpecWithDepthBias {
  cullMode?: CullMode;
  depthBias: RasterizerStateSpecDepthBias;
  faceWinding?: FaceWinding;
  shouldUseDepthBias: true;
}

interface RasterizerStateSpecWithoutDepthBias {
  cullMode?: CullMode;
  faceWinding?: FaceWinding;
  shouldUseDepthBias: false | undefined;
}

export type StencilOp =
  | "DECREMENT_AND_CLAMP"
  | "DECREMENT_AND_WRAP"
  | "INCREMENT_AND_CLAMP"
  | "INCREMENT_AND_WRAP"
  | "INVERT"
  | "KEEP"
  | "REPLACE"
  | "ZERO";

export interface StencilOpState {
  compareMask: number;
  compareOp: GLenum;
  depthFailOp: GLenum;
  failOp: GLenum;
  passOp: GLenum;
  reference: number;
  writeMask: number;
}

export interface StencilOpStateSpec {
  compareMask: number;
  compareOp: CompareOp;
  depthFailOp: StencilOp;
  failOp: StencilOp;
  passOp: StencilOp;
  reference: number;
  writeMask: number;
}

export interface VertexAttribute {
  bufferIndex: number;
  componentCount: number;
  isNormalized: boolean;
  location: GLint | null;
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
  | "SBYTE4_NORM"
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
  const depthStencil = createDepthStencilState(context, spec.depthStencil);
  const inputAssembly = createInputAssembly(context, spec.inputAssembly);
  const rasterizer = createRasterizerState(context, spec.rasterizer);
  const vertexLayout = createVertexLayout(context, spec.vertexLayout, shader);
  return {
    depthStencil,
    inputAssembly,
    rasterizer,
    shader,
    vertexLayout,
  };
};

export const getBytesPerVertex = (
  vertexLayout: VertexLayout,
  bufferIndex: number
): number => {
  const { attributes } = vertexLayout;
  const foundAttribute = attributes.find(
    attribute => attribute.bufferIndex === bufferIndex
  );
  return foundAttribute.stride;
};

export const getVertexFormatSize = (vertexFormat: VertexFormat): number => {
  switch (vertexFormat) {
    case "FLOAT1":
      return 4;
    case "FLOAT2":
      return 8;
    case "FLOAT3":
      return 12;
    case "FLOAT4":
      return 16;
    case "SBYTE4_NORM":
      return 4;
    case "UBYTE4_NORM":
      return 4;
    case "USHORT2_NORM":
      return 4;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};

export const setPipeline = (context: GloContext, pipeline: Pipeline): void => {
  const { gl, state } = context;
  gl.useProgram(pipeline.shader.handle);
  setDepthStencilState(context, pipeline.depthStencil);
  setRasterizerState(context, pipeline.rasterizer);
  state.pipeline = pipeline;
};

const createDepthStencilState = (
  context: GloContext,
  spec: DepthStencilStateSpec
): DepthStencilState => {
  const { gl } = context;
  const { shouldCompareDepth, shouldUseStencil, shouldWriteDepth } = spec;

  const depthCompareOp = spec.depthCompareOp
    ? getCompareOp(context, spec.depthCompareOp)
    : gl.LESS;

  let backStencil;
  let frontStencil;
  if (spec.shouldUseStencil) {
    backStencil = createStencilOpState(context, spec.backStencil);
    frontStencil = createStencilOpState(context, spec.frontStencil);
  } else {
    backStencil = defaultStencilOpState(context);
    frontStencil = defaultStencilOpState(context);
  }

  return {
    backStencil,
    depthCompareOp,
    frontStencil,
    shouldCompareDepth,
    shouldUseStencil,
    shouldWriteDepth,
  };
};

const createInputAssembly = (
  context: GloContext,
  spec: InputAssemblySpec
): InputAssembly => {
  const { indexType, primitiveTopology } = spec;
  return {
    bytesPerIndex: getBytesPerIndex(indexType),
    indexType: getIndexType(context, indexType),
    primitiveTopology: getPrimitiveTopology(context, primitiveTopology),
  };
};

const createRasterizerState = (
  context: GloContext,
  spec?: RasterizerStateSpec
): RasterizerState => {
  const cullMode = spec?.cullMode || "BACK";
  const faceWinding = spec?.faceWinding || "COUNTERCLOCKWISE";
  let depthBias: RasterizerStateDepthBias;
  if (spec?.shouldUseDepthBias) {
    depthBias = createRasterizerStateDepthBias(spec.depthBias);
  } else {
    depthBias = defaultRasterizerStateDepthBias();
  }
  return {
    cullMode: getCullMode(context, cullMode),
    depthBias,
    faceWinding: getFaceWinding(context, faceWinding),
    shouldUseDepthBias: spec && spec.shouldUseDepthBias,
  };
};

const createRasterizerStateDepthBias = (
  spec: RasterizerStateSpecDepthBias
): RasterizerStateDepthBias => {
  const { clamp, constant, slope } = spec;
  return {
    clamp,
    constant,
    slope,
  };
};

const createStencilOpState = (
  context: GloContext,
  spec: StencilOpStateSpec
): StencilOpState => {
  const {
    compareMask,
    compareOp,
    depthFailOp,
    failOp,
    passOp,
    reference,
    writeMask,
  } = spec;
  return {
    compareMask,
    compareOp: getCompareOp(context, compareOp),
    depthFailOp: getStencilOp(context, depthFailOp),
    failOp: getStencilOp(context, failOp),
    passOp: getStencilOp(context, passOp),
    reference,
    writeMask,
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

      let location = program.attributeLocations.get(name);
      location = location ? location : null;

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

const defaultRasterizerStateDepthBias = (): RasterizerStateDepthBias => {
  return {
    clamp: 0,
    constant: 0,
    slope: 0,
  };
};

const defaultStencilOpState = (context: GloContext): StencilOpState => {
  const { gl } = context;
  return {
    compareMask: 0xffffffff,
    compareOp: gl.ALWAYS,
    depthFailOp: gl.KEEP,
    failOp: gl.KEEP,
    passOp: gl.KEEP,
    reference: 0,
    writeMask: 0xffffffff,
  };
};

const getBytesPerIndex = (indexType: IndexType): number => {
  switch (indexType) {
    case "NONE":
      return 0;
    case "UINT16":
      return 2;
    case "UINT32":
      return 4;
    default:
      throw new Error(`Index type value ${indexType} is unknown.`);
  }
};

const getCompareOp = (context: GloContext, compareOp: CompareOp): GLenum => {
  const { gl } = context;
  switch (compareOp) {
    case "ALWAYS":
      return gl.ALWAYS;
    case "EQUAL":
      return gl.EQUAL;
    case "GREATER":
      return gl.GREATER;
    case "GREATER_OR_EQUAL":
      return gl.GEQUAL;
    case "LESS":
      return gl.LESS;
    case "LESS_OR_EQUAL":
      return gl.LEQUAL;
    case "NEVER":
      return gl.NEVER;
    case "NOT_EQUAL":
      return gl.NOTEQUAL;
    default:
      throw new Error(`Compare op value ${compareOp} is unknown.`);
  }
};

const getCullMode = (context: GloContext, cullMode: CullMode): GLenum => {
  const { gl } = context;
  switch (cullMode) {
    case "BACK":
      return gl.BACK;
    case "FRONT":
      return gl.FRONT;
    case "NONE":
      return gl.FRONT_AND_BACK;
    default:
      throw new Error(`Cull mode value ${cullMode} is unknown.`);
  }
};

const getFaceWinding = (
  context: GloContext,
  faceWinding: FaceWinding
): GLenum => {
  const { gl } = context;
  switch (faceWinding) {
    case "CLOCKWISE":
      return gl.CW;
    case "COUNTERCLOCKWISE":
      return gl.CCW;
    default:
      throw new Error(`Face winding value ${faceWinding} is unknown.`);
  }
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

const getStencilOp = (context: GloContext, stencilOp: StencilOp): GLenum => {
  const { gl } = context;
  switch (stencilOp) {
    case "DECREMENT_AND_CLAMP":
      return gl.DECR;
    case "DECREMENT_AND_WRAP":
      return gl.DECR_WRAP;
    case "INCREMENT_AND_CLAMP":
      return gl.INCR;
    case "INCREMENT_AND_WRAP":
      return gl.INCR_WRAP;
    case "INVERT":
      return gl.INVERT;
    case "KEEP":
      return gl.KEEP;
    case "REPLACE":
      return gl.REPLACE;
    case "ZERO":
      return gl.ZERO;
    default:
      throw new Error(`Stencil op value ${stencilOp} is unknown.`);
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
    case "SBYTE4_NORM":
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
    case "SBYTE4_NORM":
    case "UBYTE4_NORM":
    case "USHORT2_NORM":
      return true;
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
    case "SBYTE4_NORM":
      return gl.BYTE;
    case "UBYTE4_NORM":
      return gl.UNSIGNED_BYTE;
    case "USHORT2_NORM":
      return gl.UNSIGNED_SHORT;
    default:
      throw new Error(`Vertex format of type ${vertexFormat} is unknown.`);
  }
};

const setDepthStencilState = (
  context: GloContext,
  state: DepthStencilState
) => {
  const { gl } = context;
  const { shouldCompareDepth, shouldUseStencil, shouldWriteDepth } = state;
  const priorState = context.state.pipeline?.depthStencil;

  if (!priorState || shouldCompareDepth !== priorState.shouldCompareDepth) {
    if (shouldCompareDepth) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  }

  if (!priorState || shouldWriteDepth !== priorState.shouldWriteDepth) {
    gl.depthMask(shouldWriteDepth);
  }

  if (!priorState || shouldUseStencil !== priorState.shouldUseStencil) {
    if (shouldUseStencil) {
      gl.enable(gl.STENCIL_TEST);
    } else {
      gl.disable(gl.STENCIL_TEST);
    }
  }

  if (shouldUseStencil) {
    setStencilState(
      context,
      state.frontStencil,
      priorState?.frontStencil,
      gl.FRONT
    );
    setStencilState(
      context,
      state.backStencil,
      priorState?.backStencil,
      gl.BACK
    );
  }
};

const setRasterizerState = (context: GloContext, state: RasterizerState) => {
  const { gl } = context;
  const priorState = context.state.pipeline?.rasterizer;

  if (!priorState || state.cullMode !== priorState.cullMode) {
    const wasEnabled = priorState && priorState.cullMode !== gl.FRONT_AND_BACK;
    const isEnabled = state.cullMode !== gl.FRONT_AND_BACK;
    if (wasEnabled !== isEnabled) {
      if (isEnabled) {
        gl.enable(gl.CULL_FACE);
      } else {
        gl.disable(gl.CULL_FACE);
      }
    }
    if (isEnabled) {
      gl.cullFace(state.cullMode);
    }
  }

  if (!priorState || state.faceWinding !== priorState.faceWinding) {
    gl.frontFace(state.faceWinding);
  }

  if (
    !priorState ||
    state.shouldUseDepthBias !== priorState.shouldUseDepthBias
  ) {
    if (state.shouldUseDepthBias) {
      gl.enable(gl.POLYGON_OFFSET_FILL);
    } else {
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
  }

  if (
    !priorState ||
    state.depthBias.constant !== priorState.depthBias.constant ||
    state.depthBias.slope !== priorState.depthBias.slope
  ) {
    gl.polygonOffset(state.depthBias.slope, state.depthBias.constant);
  }
};

const setStencilState = (
  context: GloContext,
  state: StencilOpState,
  priorState: StencilOpState | undefined,
  face: GLenum
) => {
  const { gl } = context;
  const {
    compareMask,
    compareOp,
    depthFailOp,
    failOp,
    passOp,
    reference,
    writeMask,
  } = state;

  if (
    !priorState ||
    compareMask !== priorState.compareMask ||
    compareOp !== priorState.compareOp ||
    reference !== priorState.reference
  ) {
    gl.stencilFuncSeparate(face, compareOp, reference, compareMask);
  }

  if (
    !priorState ||
    depthFailOp !== priorState.depthFailOp ||
    failOp !== priorState.failOp ||
    passOp !== priorState.passOp
  ) {
    gl.stencilOpSeparate(face, failOp, depthFailOp, passOp);
  }

  if (!priorState || writeMask !== priorState.writeMask) {
    gl.stencilMaskSeparate(face, writeMask);
  }
};
