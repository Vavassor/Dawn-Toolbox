import { Texture } from "./Texture";
import { GloContext } from "./GloContext";
import { TraceError } from "../TraceError";

export interface Attachment {
  mipLevel: number;
  point: GLenum;
  slice: number;
  texture: Texture;
}

export interface AttachmentSpec {
  mipLevel: number;
  slice: number;
  texture: Texture;
}

export interface Pass {
  colorAttachments: Attachment[];
  depthStencilAttachment: Attachment;
  framebuffer: WebGLFramebuffer;
}

export interface PassSpec {
  colorAttachments: Attachment[];
  depthStencilAttachment: Attachment;
}

export const bindPass = (context: GloContext, pass: Pass | null): void => {
  const { gl } = context;
  const drawBuffersExt = context.extensions.drawBuffers;
  gl.bindFramebuffer(gl.FRAMEBUFFER, pass ? pass.framebuffer : null);

  const drawAttachments = pass.colorAttachments.map(
    attachment => attachment.point
  );
  drawBuffersExt.drawBuffersWEBGL(drawAttachments);
};

export const createPass = (context: GloContext, spec: PassSpec): Pass => {
  const { gl } = context;
  const colorAttachmentSpecs = spec.colorAttachments;
  const depthStencilAttachmentSpec = spec.depthStencilAttachment;

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  const colorAttachments = colorAttachmentSpecs.map((attachmentSpec, index) => {
    const point = gl.COLOR_ATTACHMENT0 + index;
    return createAttachment(context, attachmentSpec, point);
  });

  const depthStencilAttachment = createAttachment(
    context,
    depthStencilAttachmentSpec,
    getDepthStencilAttachmentPoint(context, depthStencilAttachmentSpec)
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    let name;
    try {
      name = getFramebufferStatusName(context, status);
    } catch (error) {
      throw new TraceError(error, "Framebuffer status check failed.");
    }
    throw new Error(`Framebuffer status check failed with status ${name}.`);
  }

  return {
    colorAttachments,
    depthStencilAttachment,
    framebuffer,
  };
};

const createAttachment = (
  context: GloContext,
  spec: AttachmentSpec,
  point: GLenum
): Attachment => {
  const { gl } = context;
  const { mipLevel, slice, texture } = spec;

  switch (texture.type) {
    case "2D":
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        point,
        gl.TEXTURE_2D,
        texture.handle,
        mipLevel
      );
      break;
    case "CUBE":
      const target = getCubeFaceTarget(context, slice);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, point, target, texture, mipLevel);
      break;
  }

  return {
    mipLevel,
    point,
    slice,
    texture,
  };
};

const getCubeFaceTarget = (context: GloContext, slice: number): GLenum => {
  const { gl } = context;
  switch (slice) {
    default:
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
  }
};

const getDepthStencilAttachmentPoint = (
  context: GloContext,
  spec: AttachmentSpec
): GLenum => {
  const { gl } = context;
  const { internalFormat } = spec.texture;
  switch (internalFormat) {
    case gl.DEPTH_COMPONENT:
      return gl.DEPTH_ATTACHMENT;
    case gl.DEPTH_STENCIL:
      return gl.DEPTH_STENCIL_ATTACHMENT;
    default:
      throw new Error(
        `Depth stencil attachment cannot be a texture of internal format ${internalFormat}.`
      );
  }
};

const getFramebufferStatusName = (
  context: GloContext,
  status: GLenum
): string => {
  const { gl } = context;
  switch (status) {
    case gl.FRAMEBUFFER_COMPLETE:
      return "FRAMEBUFFER_COMPLETE";
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
    case gl.FRAMEBUFFER_UNSUPPORTED:
      return "FRAMEBUFFER_UNSUPPORTED";
    default:
      throw new Error(`Framebuffer status value ${status} is unknown.`);
  }
};
