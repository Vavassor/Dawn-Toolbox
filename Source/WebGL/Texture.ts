import { GloContext } from "./GloContext";
import { Size2 } from "../Size2";

export type PixelFormat =
  | "RGBA8"
  | "RGBA32F"
  | "RGB8"
  | "RGB32F"
  | "RG8"
  | "RG32F"
  | "R8"
  | "R32F"
  | "DEPTH16"
  | "DEPTH24"
  | "DEPTH24_STENCIL8";

export type SamplerAddressMode = "CLAMP_TO_EDGE" | "MIRRORED_REPEAT" | "REPEAT";

export type SamplerFilter = "LINEAR" | "POINT";

export interface SamplerSpec {
  addressModeU: SamplerAddressMode;
  addressModeV: SamplerAddressMode;
  magnifyFilter: SamplerFilter;
  minifyFilter: SamplerFilter;
  mipmapFilter: SamplerFilter;
}

export interface Texture {
  handle: WebGLTexture;
  internalFormat: GLenum;
  size: Size2;
  type: TextureType;
}

export interface TextureContent {
  pixelFormat: PixelFormat;
  subimagesByCubeFaceAndMipLevel: TextureSubimage[][];
}

export interface TextureSpec {
  content?: TextureContent;
  generateMipmaps: boolean;
  pixelFormat: PixelFormat;
  sampler: SamplerSpec;
  size: Size2;
  type: TextureType;
}

export interface TextureSubimage {
  pixels: ArrayBufferView;
}

export type TextureType = "2D" | "CUBE";

export const bind = (
  context: GloContext,
  texture: Texture,
  activeTexture: number
) => {
  const { gl } = context;
  const { handle, type } = texture;
  const target = getTextureTypeTarget(context, type);
  gl.activeTexture(gl.TEXTURE0 + activeTexture);
  gl.bindTexture(target, handle);
};

export const createTexture = (
  context: GloContext,
  spec: TextureSpec
): Texture => {
  const { gl } = context;
  const { pixelFormat, sampler, type } = spec;

  const content = spec.content ? spec.content : null;
  const genericFormat = getPixelFormatGenericFormat(context, pixelFormat);
  const internalFormat = getPixelFormatInternalFormat(context, pixelFormat);
  const minifyFilter = getSamplerFilter(
    context,
    sampler.minifyFilter,
    sampler.mipmapFilter
  );
  const magnifyFilter = getSamplerFilter(
    context,
    sampler.magnifyFilter,
    sampler.mipmapFilter
  );
  const addressModeU = getSamplerAddressMode(context, sampler.addressModeU);
  const addressModeV = getSamplerAddressMode(context, sampler.addressModeV);
  const size = spec.size;
  const formatType = spec.content
    ? getPixelFormatType(context, spec.content.pixelFormat)
    : getPixelFormatType(context, pixelFormat);
  const target = getTextureTypeTarget(context, type);

  const texture = gl.createTexture();
  gl.bindTexture(target, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minifyFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnifyFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, addressModeU);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, addressModeV);

  const cubeFaceCount = getTextureTypeCubeFaceCount(type);
  for (let cubeFace = 0; cubeFace < cubeFaceCount; cubeFace++) {
    const subimageTarget = getTextureTypeSubimageTarget(
      context,
      type,
      cubeFace
    );
    const subimagesByMipLevel =
      content.subimagesByCubeFaceAndMipLevel[cubeFace];
    for (let mipLevel = 0; mipLevel < subimagesByMipLevel.length; mipLevel++) {
      const subimage = subimagesByMipLevel[mipLevel];
      const width = Math.max(size.width >> mipLevel, 1);
      const height = Math.max(size.height >> mipLevel, 1);
      gl.texImage2D(
        subimageTarget,
        mipLevel,
        internalFormat,
        width,
        height,
        0,
        genericFormat,
        formatType,
        subimage.pixels
      );
    }
  }

  if (spec.generateMipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  return {
    handle: texture,
    internalFormat,
    size,
    type,
  };
};

const getPixelFormatGenericFormat = (
  context: GloContext,
  pixelFormat: PixelFormat
): GLenum => {
  const { gl } = context;
  switch (pixelFormat) {
    case "RGBA8":
      return gl.RGBA;
    case "RGB8":
      return gl.RGB;
    case "RG8":
      return gl.LUMINANCE_ALPHA;
    case "R8":
      return gl.LUMINANCE;
    case "DEPTH16":
    case "DEPTH24":
      return gl.DEPTH_COMPONENT;
    case "DEPTH24_STENCIL8":
      return gl.DEPTH_STENCIL;
    case "RGBA32F":
    case "RGB32F":
    case "RG32F":
    case "R32F":
      return gl.FLOAT;
    default:
      throw new Error(`Pixel format of type ${pixelFormat} is unknown`);
  }
};

const getPixelFormatInternalFormat = (
  context: GloContext,
  pixelFormat: PixelFormat
): GLenum => {
  const { gl } = context;
  switch (pixelFormat) {
    case "RGBA8":
      return gl.RGBA;
    case "RGB8":
      return gl.RGB;
    case "RG8":
      return gl.LUMINANCE_ALPHA;
    case "R8":
      return gl.LUMINANCE;
    case "DEPTH16":
    case "DEPTH24":
      return gl.DEPTH_COMPONENT;
    case "DEPTH24_STENCIL8":
      return gl.DEPTH_STENCIL;
    case "RGBA32F":
    case "RGB32F":
    case "RG32F":
    case "R32F":
      throw new Error(
        `Pixel format of type ${pixelFormat} is unsupported as an internal format.`
      );
    default:
      throw new Error(`Pixel format of type ${pixelFormat} is unknown`);
  }
};

const getPixelFormatType = (
  context: GloContext,
  pixelFormat: PixelFormat
): GLenum => {
  const { gl } = context;
  const depthTexture = context.extensions.depthTexture;
  switch (pixelFormat) {
    case "RGBA8":
    case "RGB8":
    case "RG8":
    case "R8":
      return gl.UNSIGNED_BYTE;
    case "RGBA32F":
    case "RGB32F":
    case "RG32F":
    case "R32F":
      return gl.FLOAT;
    case "DEPTH16":
      return gl.UNSIGNED_SHORT;
    case "DEPTH24":
      return gl.UNSIGNED_INT;
    case "DEPTH24_STENCIL8":
      return depthTexture.UNSIGNED_INT_24_8_WEBGL;
    default:
      throw new Error(`Pixel format of type ${pixelFormat} is unknown.`);
  }
};

const getSamplerAddressMode = (
  context: GloContext,
  samplerAddressMode: SamplerAddressMode
): GLenum => {
  const { gl } = context;
  switch (samplerAddressMode) {
    case "CLAMP_TO_EDGE":
      return gl.CLAMP_TO_EDGE;
    case "MIRRORED_REPEAT":
      return gl.MIRRORED_REPEAT;
    case "REPEAT":
      return gl.REPEAT;
    default:
      throw new Error(
        `Sampler address mode of type ${samplerAddressMode} is unknown.`
      );
  }
};

const getSamplerFilter = (
  context: GloContext,
  filter: SamplerFilter,
  mipmapFilter: SamplerFilter
): GLenum => {
  const { gl } = context;
  switch (filter) {
    case "LINEAR":
      switch (mipmapFilter) {
        case "LINEAR":
          return gl.LINEAR_MIPMAP_LINEAR;
        case "POINT":
          return gl.LINEAR_MIPMAP_NEAREST;
        default:
          throw new Error(`Sampler filter of type ${filter} is unknown.`);
      }
    case "POINT":
      switch (mipmapFilter) {
        case "LINEAR":
          return gl.NEAREST_MIPMAP_LINEAR;
        case "POINT":
          return gl.NEAREST_MIPMAP_NEAREST;
        default:
          throw new Error(`Sampler filter of type ${filter} is unknown.`);
      }
    default:
      throw new Error(`Sampler filter of type ${filter} is unknown.`);
  }
};

const getTextureTypeCubeFaceCount = (textureType: TextureType): number => {
  switch (textureType) {
    case "2D":
      return 1;
    case "CUBE":
      return 6;
    default:
      throw new Error(`Texture type of type ${textureType} is unknown.`);
  }
};

const getTextureTypeSubimageTarget = (
  context: GloContext,
  textureType: TextureType,
  cubeFace: number
): GLenum => {
  const { gl } = context;
  switch (textureType) {
    case "2D":
      return gl.TEXTURE_2D;
    case "CUBE":
      switch (cubeFace) {
        case 0:
          return gl.TEXTURE_CUBE_MAP_POSITIVE_X;
        case 1:
          return gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
        case 2:
          return gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
        case 3:
          return gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
        case 4:
          return gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
        case 5:
          return gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
        default:
          throw new Error(`Cube face of index ${cubeFace} is invalid.`);
      }
    default:
      throw new Error(`Texture type of type ${textureType} is unknown.`);
  }
};

const getTextureTypeTarget = (
  context: GloContext,
  textureType: TextureType
): GLenum => {
  const { gl } = context;
  switch (textureType) {
    case "2D":
      return gl.TEXTURE_2D;
    case "CUBE":
      return gl.TEXTURE_CUBE_MAP;
    default:
      throw new Error(`Texture type of type ${textureType} is unknown.`);
  }
};
