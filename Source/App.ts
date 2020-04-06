import { flattenOnce, flatMap } from "./Array";
import { Camera, getProjection, getView } from "./Camera";
import { clamp } from "./Clamp";
import { Color } from "./Color";
import { COLORS } from "./Colors";
import { getBinaryFile } from "./Fetch";
import { Bivector3 } from "./Geometry/Bivector3";
import { Matrix4 } from "./Geometry/Matrix4";
import { Point3 } from "./Geometry/Point3";
import { Rotor3 } from "./Geometry/Rotor3";
import { Vector2 } from "./Geometry/Vector2";
import { Vector3 } from "./Geometry/Vector3";
import {
  Action,
  Axis2dDirection,
  createInputState,
  getAxis2d,
  InputState,
  KeyboardEventKey,
  KeyMapping,
  KeyMappingType,
  updateInput,
} from "./Input";
import { packSnorm } from "./Packing";
import {
  addCuboid,
  addLineSegment,
  addSphere,
  createPrimitiveContext,
  PrimitiveContext,
  resetPrimitives,
} from "./Primitive";
import { drawPrimitives, PRIMITIVE_BATCH_CAP_IN_BYTES } from "./PrimitiveDraw";
import * as Dwn from "./SceneFile";
import testDwn from "./Scenes/test.dwn";
import basicPixelSource from "./Shaders/basic.ps.glsl";
import basicVertexSource from "./Shaders/basic.vs.glsl";
import litPixelSource from "./Shaders/lit.ps.glsl";
import litVertexSource from "./Shaders/lit.vs.glsl";
import visualizeNormalPixelSource from "./Shaders/visualize_normal.ps.glsl";
import visualizeNormalVertexSource from "./Shaders/visualize_normal.vs.glsl";
import { Size2 } from "./Size2";
import {
  BufferFormat,
  BufferSpec,
  BufferUsage,
  createBuffer,
  GloBuffer,
} from "./WebGL/GloBuffer";
import { clearTarget, draw, GloContext } from "./WebGL/GloContext";
import {
  createPipeline,
  getVertexFormatSize,
  Pipeline,
  setPipeline,
  VertexFormat,
} from "./WebGL/Pipeline";
import { createShader } from "./WebGL/Shader";
import {
  createShaderProgram,
  setUniform3fv,
  setUniformMatrix4fv,
  ShaderProgram,
} from "./WebGL/ShaderProgram";
import { setViewport } from "./WebGL/Viewport";

export interface App {
  buffers: BufferSet;
  bufferChangeset: Changeset<BufferSpec>;
  camera: Camera;
  canvasSize: Size2;
  context: GloContext;
  handleMouseMove?: HandleMouseMove;
  input: InputState;
  meshChangeset: Changeset<MeshSpec>;
  pipelines: PipelineSet;
  primitiveContext: PrimitiveContext;
  programs: ShaderProgramSet;
  transformNodes: TransformNode[];
  transformNodeChangeset: Changeset<TransformNode>;
}

interface Changeset<T> {
  added: T[];
}

interface BufferSet {
  dynamic: GloBuffer[];
  primitiveIndex: GloBuffer;
  primitiveVertex: GloBuffer;
}

interface DirectionalLight {
  direction: Vector3;
  radiance: Vector3;
}

export type HandleMouseMove = (event: MouseEvent) => void;

interface MeshObject {
  indexBuffer: GloBuffer;
  indicesCount: number;
  startIndex: number;
  vertexBuffers: GloBuffer[];
}

interface MeshSpec {
  indexBufferIndex: number;
  indicesCount: number;
  startIndex: number;
  vertexBufferIndices: number[];
}

interface PipelineSet {
  line: Pipeline;
  surface: Pipeline;
  visualizeNormal: Pipeline;
}

interface PointLight {
  position: Point3;
  radiance: Vector3;
}

interface ShaderProgramSet {
  basic: ShaderProgram;
  lit: ShaderProgram;
  visualizeNormal: ShaderProgram;
}

interface Transform {
  orientation: Rotor3;
  position: Point3;
  scale: Vector3;
}

interface TransformNode {
  children: TransformNode[];
  object: MeshObject;
  parent: TransformNode;
  transform: Transform;
}

export const createApp = (
  context: GloContext,
  initialCanvasSize: Size2
): App => {
  const keyMappings = createKeyMappings();
  const programs = createShaderProgramSet(context);
  const app: App = {
    buffers: createBufferSet(context),
    bufferChangeset: createChangeset(),
    camera: {
      farClipPlane: 100,
      nearClipPlane: 0.001,
      pitch: 0,
      position: new Point3([0, 0, 1]),
      verticalFieldOfView: Math.PI / 2,
      yaw: 0,
    },
    canvasSize: initialCanvasSize,
    context,
    input: createInputState(keyMappings),
    meshChangeset: createChangeset(),
    pipelines: createPipelineSet(context, programs),
    primitiveContext: createPrimitiveContext(),
    programs,
    transformNodes: [],
    transformNodeChangeset: createChangeset(),
  };
  loadScenes(app);
  return app;
};

export const handleResize = (event: UIEvent, app: App): any => {
  const height = window.innerHeight;
  const width = window.innerWidth;
  console.log(`resize event: ${width}x${height}`);
};

export const updateFrame = (app: App) => {
  const {
    buffers,
    camera,
    context,
    input,
    pipelines,
    primitiveContext,
    programs,
  } = app;

  updateInput(input);
  updateCamera(camera, input);
  updateBufferChangeset(app);
  resetPrimitives(primitiveContext);

  addLineSegment(primitiveContext, {
    endpoints: [new Point3([1, 0, -1]), new Point3([0, 1, 1])],
    style: { color: COLORS.white },
  });
  addAxisIndicator(primitiveContext);
  addSphere(primitiveContext, {
    center: new Point3([2, 2, 1]),
    radius: 1,
    style: { color: COLORS.white },
  });
  addSphere(primitiveContext, {
    center: new Point3([-2, 2, 0]),
    radius: 0.5,
    style: { color: COLORS.white },
  });
  addCuboid(primitiveContext, {
    center: new Point3([0, -3, 0.5]),
    orientation: Rotor3.fromAngleAndPlane(Math.PI / 3, Bivector3.unitXZ()),
    size: { width: 1, height: 0.5, depth: 2 },
    style: { color: COLORS.white },
  });
  addCuboid(primitiveContext, {
    center: new Point3([2, -2, 1]),
    size: { width: 1, height: 1, depth: 1 },
    style: { color: COLORS.white },
  });
  addCuboid(primitiveContext, {
    center: new Point3([0, 0, -0.5]),
    size: { width: 10, height: 0.1, depth: 10 },
    style: { color: COLORS.white },
  });

  clearTarget(context, {
    color: {
      shouldClear: true,
      value: Color.opaqueBlack(),
    },
  });

  setViewport(context, {
    bottomLeftX: 0,
    bottomLeftY: 0,
    farPlane: 1,
    height: app.canvasSize.height,
    nearPlane: 0,
    width: app.canvasSize.width,
  });

  const model = Matrix4.identity();
  const view = getView(camera);
  const projection = getProjection(
    camera,
    app.canvasSize.width,
    app.canvasSize.height
  );
  const modelView = Matrix4.multiply(view, model);
  const modelViewProjection = Matrix4.multiply(projection, modelView);
  const lightDirection = new Vector3([-0.5345, -0.8018, -0.2673]);
  const directionalLight: DirectionalLight = {
    direction: lightDirection,
    radiance: new Vector3([1, 1, 1]),
  };
  const pointLight: PointLight = {
    position: new Point3([1, -1, 1]),
    radiance: new Vector3([1, 1, 1]),
  };

  setPipeline(context, pipelines.surface);
  setUniform3fv(
    context,
    programs.lit,
    "directional_light.direction",
    Vector3.toFloat32Array(directionalLight.direction)
  );
  setUniform3fv(
    context,
    programs.lit,
    "directional_light.radiance",
    Vector3.toFloat32Array(directionalLight.radiance)
  );
  setUniform3fv(
    context,
    programs.lit,
    "point_light.position",
    Point3.toFloat32Array(pointLight.position)
  );
  setUniform3fv(
    context,
    programs.lit,
    "point_light.radiance",
    Vector3.toFloat32Array(pointLight.radiance)
  );
  setUniformMatrix4fv(
    context,
    programs.lit,
    "model",
    Matrix4.toFloat32Array(Matrix4.transpose(model))
  );
  setUniformMatrix4fv(
    context,
    programs.lit,
    "model_view_projection",
    Matrix4.toFloat32Array(Matrix4.transpose(modelViewProjection))
  );
  setUniform3fv(
    context,
    programs.lit,
    "view_position",
    Point3.toFloat32Array(camera.position)
  );

  drawPrimitives(app);

  if (buffers.dynamic.length > 1) {
    const testModel = Matrix4.translation(new Vector3([-2, 2, 1]));
    const testModelView = Matrix4.multiply(view, testModel);
    const testModelViewProjection = Matrix4.multiply(projection, testModelView);
    setUniformMatrix4fv(
      context,
      programs.lit,
      "model",
      Matrix4.toFloat32Array(Matrix4.transpose(testModel))
    );
    setUniformMatrix4fv(
      context,
      programs.lit,
      "model_view_projection",
      Matrix4.toFloat32Array(Matrix4.transpose(testModelViewProjection))
    );
    draw(context, {
      indexBuffer: buffers.dynamic[0],
      indicesCount: 36,
      startIndex: 0,
      vertexBuffers: [buffers.dynamic[1]],
    });
  }
};

const addAxisIndicator = (context: PrimitiveContext) => {
  const origin = Point3.zero();
  const xAxis = Point3.fromVector3(Vector3.unitX());
  const yAxis = Point3.fromVector3(Vector3.unitY());
  const zAxis = Point3.fromVector3(Vector3.unitZ());
  addLineSegment(context, {
    endpoints: [origin, xAxis],
    style: { color: COLORS.orange },
  });
  addLineSegment(context, {
    endpoints: [origin, yAxis],
    style: { color: COLORS.lightGreen },
  });
  addLineSegment(context, {
    endpoints: [origin, zAxis],
    style: { color: COLORS.blue },
  });
};

const createBufferSet = (context: GloContext): BufferSet => {
  const primitiveIndex = createBuffer(context, {
    byteCount: PRIMITIVE_BATCH_CAP_IN_BYTES,
    format: BufferFormat.IndexBuffer,
    usage: BufferUsage.Dynamic,
  });

  const primitiveVertex = createBuffer(context, {
    byteCount: PRIMITIVE_BATCH_CAP_IN_BYTES,
    format: BufferFormat.VertexBuffer,
    usage: BufferUsage.Dynamic,
  });

  return {
    dynamic: [],
    primitiveVertex,
    primitiveIndex,
  };
};

function createChangeset<T>(): Changeset<T> {
  return {
    added: [],
  };
}

const createKeyMappings = (): KeyMapping[] => {
  return [
    {
      action: Action.Move,
      direction: Axis2dDirection.PositiveY,
      key: KeyboardEventKey.W,
      type: KeyMappingType.Axis2d,
    },
    {
      action: Action.Move,
      direction: Axis2dDirection.NegativeY,
      key: KeyboardEventKey.S,
      type: KeyMappingType.Axis2d,
    },
    {
      action: Action.Move,
      direction: Axis2dDirection.PositiveX,
      key: KeyboardEventKey.D,
      type: KeyMappingType.Axis2d,
    },
    {
      action: Action.Move,
      direction: Axis2dDirection.NegativeX,
      key: KeyboardEventKey.A,
      type: KeyMappingType.Axis2d,
    },
  ];
};

const createPipelineSet = (
  context: GloContext,
  programs: ShaderProgramSet
): PipelineSet => {
  const line = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "UINT16",
      primitiveTopology: "LINE_LIST",
    },
    shader: programs.basic,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  const surface = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "UINT16",
      primitiveTopology: "TRIANGLE_LIST",
    },
    shader: programs.lit,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "SBYTE4_NORM", name: "vertex_normal" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  const visualizeNormal = createPipeline(context, {
    depthStencil: {
      shouldCompareDepth: true,
      shouldWriteDepth: true,
      shouldUseStencil: false,
    },
    inputAssembly: {
      indexType: "UINT16",
      primitiveTopology: "TRIANGLE_LIST",
    },
    shader: programs.visualizeNormal,
    vertexLayout: {
      attributes: [
        { bufferIndex: 0, format: "FLOAT3", name: "vertex_position" },
        { bufferIndex: 0, format: "SBYTE4_NORM", name: "vertex_normal" },
        { bufferIndex: 0, format: "UBYTE4_NORM", name: "vertex_color" },
      ],
    },
  });

  return {
    line,
    surface,
    visualizeNormal,
  };
};

const createShaderProgramSet = (context: GloContext): ShaderProgramSet => {
  const basicVertexShader = createShader(context, {
    source: basicVertexSource,
    type: "VERTEX",
  });

  const basicPixelShader = createShader(context, {
    source: basicPixelSource,
    type: "PIXEL",
  });

  const litVertexShader = createShader(context, {
    source: litVertexSource,
    type: "VERTEX",
  });

  const litPixelShader = createShader(context, {
    source: litPixelSource,
    type: "PIXEL",
  });

  const visualizeNormalVertexShader = createShader(context, {
    source: visualizeNormalVertexSource,
    type: "VERTEX",
  });

  const visualizeNormalPixelShader = createShader(context, {
    source: visualizeNormalPixelSource,
    type: "PIXEL",
  });

  const basic = createShaderProgram(context, {
    shaders: {
      pixel: basicPixelShader,
      vertex: basicVertexShader,
    },
    uniforms: ["model_view_projection"],
    vertexLayout: {
      attributes: [{ name: "vertex_position" }, { name: "vertex_color" }],
    },
  });

  const lit = createShaderProgram(context, {
    shaders: {
      pixel: litPixelShader,
      vertex: litVertexShader,
    },
    uniforms: [
      "directional_light.direction",
      "directional_light.radiance",
      "model",
      "model_view_projection",
      "point_light.position",
      "point_light.radiance",
      "view_position",
    ],
    vertexLayout: {
      attributes: [
        { name: "vertex_position" },
        { name: "vertex_normal" },
        { name: "vertex_color" },
      ],
    },
  });

  const visualizeNormal = createShaderProgram(context, {
    shaders: {
      pixel: visualizeNormalPixelShader,
      vertex: visualizeNormalVertexShader,
    },
    uniforms: ["model", "model_view_projection"],
    vertexLayout: {
      attributes: [{ name: "vertex_position" }, { name: "vertex_normal" }],
    },
  });

  return {
    basic,
    lit,
    visualizeNormal,
  };
};

const getAccessorByType = (
  vertexAttributes: Dwn.VertexAttribute[],
  type: Dwn.VertexAttributeType
): Dwn.Accessor => {
  const attribute = vertexAttributes.find(
    (vertexAttribute) => vertexAttribute.type === type
  );
  return attribute.accessor;
};

const interleaveAttributes = (
  attributes: Dwn.VertexAttribute[]
): ArrayBuffer => {
  const types = [
    Dwn.VertexAttributeType.Position,
    Dwn.VertexAttributeType.Normal,
    Dwn.VertexAttributeType.Color,
  ];
  const targetVertexFormats: VertexFormat[] = [
    "FLOAT3",
    "SBYTE4_NORM",
    "UBYTE4_NORM",
  ];
  const accessors = types.map((type) => getAccessorByType(attributes, type));
  const targetByteStride = targetVertexFormats.reduce(
    (byteStride, vertexFormat) => {
      const bytesPerAttribute = getVertexFormatSize(vertexFormat);
      return byteStride + bytesPerAttribute;
    },
    0
  );
  const vertexCount = Dwn.getElementCount(accessors[0]);
  const vertices = new ArrayBuffer(targetByteStride * vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    const vertexByteIndex = targetByteStride * i;
    let attributeByteOffset = 0;

    for (let j = 0; j < accessors.length; j++) {
      const accessor = accessors[j];
      const targetVertexFormat = targetVertexFormats[j];
      const { buffer, byteIndex, componentCount, componentType } = accessor;
      const startByteIndex = accessor.byteStride * i + byteIndex;
      const attributeByteIndex = vertexByteIndex + attributeByteOffset;

      switch (componentType) {
        case Dwn.ComponentType.Float32: {
          const sourceView = new DataView(buffer);
          const bytesPerFloat32 = 4;
          switch (targetVertexFormat) {
            case "FLOAT3": {
              const targetView = new Float32Array(vertices, attributeByteIndex);
              for (let k = 0; k < componentCount; k++) {
                targetView[k] = sourceView.getFloat32(
                  bytesPerFloat32 * k + startByteIndex,
                  true
                );
              }
              break;
            }
            case "SBYTE4_NORM": {
              const targetView = new Int8Array(vertices, attributeByteIndex);
              for (let k = 0; k < componentCount; k++) {
                const value = sourceView.getFloat32(
                  bytesPerFloat32 * k + startByteIndex,
                  true
                );
                targetView[k] = packSnorm(value);
              }
              break;
            }
          }
          break;
        }
        case Dwn.ComponentType.Uint8: {
          const sourceView = new DataView(buffer);
          const targetView = new Uint8Array(vertices, attributeByteIndex);
          switch (targetVertexFormat) {
            case "UBYTE4_NORM": {
              for (let k = 0; k < componentCount; k++) {
                targetView[k] = sourceView.getUint8(k + startByteIndex);
              }
              break;
            }
          }
          break;
        }
      }

      attributeByteOffset += getVertexFormatSize(targetVertexFormat);
    }
  }

  return vertices;
};

const loadScenes = async (app: App) => {
  const { bufferChangeset, meshChangeset } = app;
  const fileContent = await getBinaryFile(testDwn);
  const scene = Dwn.deserialize(fileContent);

  const addedMeshes = scene.meshes.map((mesh, meshIndex) => {
    const meshSpec: MeshSpec = {
      indexBufferIndex: 2 * meshIndex,
      indicesCount: Dwn.getElementCount(mesh.indexAccessor),
      startIndex: 0,
      vertexBufferIndices: [2 * meshIndex + 1],
    };
    return meshSpec;
  });

  const addedBuffers = flatMap(scene.meshes, (mesh) => {
    const indexBufferContent = mesh.indexAccessor.buffer;
    const indexBuffer: BufferSpec = {
      byteCount: indexBufferContent.byteLength,
      content: indexBufferContent,
      format: BufferFormat.IndexBuffer,
      usage: BufferUsage.Static,
    };

    const vertexBufferContent = interleaveAttributes(
      mesh.vertexLayout.vertexAttributes
    );
    const vertexBuffer: BufferSpec = {
      byteCount: vertexBufferContent.byteLength,
      content: vertexBufferContent,
      format: BufferFormat.VertexBuffer,
      usage: BufferUsage.Static,
    };

    return [indexBuffer, vertexBuffer];
  });

  bufferChangeset.added = addedBuffers;
  meshChangeset.added = addedMeshes;
};

const updateBufferChangeset = (app: App) => {
  const { buffers, bufferChangeset, context } = app;
  const addedBuffers = bufferChangeset.added;
  bufferChangeset.added = [];
  const newBuffers = addedBuffers.map((spec) => createBuffer(context, spec));
  buffers.dynamic = buffers.dynamic.concat(newBuffers);
};

const updateCamera = (camera: Camera, input: InputState) => {
  const { delta } = input.pointer;
  const horizontalPixelsPerRadian = 0.001;
  const moveSpeed = 0.1;
  const verticalPixelsPerRadian = 0.001;
  const deltaPitch = verticalPixelsPerRadian * delta.y;

  camera.pitch = clamp(camera.pitch - deltaPitch, -Math.PI / 2, Math.PI / 2);
  camera.yaw -= horizontalPixelsPerRadian * delta.x;

  const direction = Vector2.rotate(
    getAxis2d(input, Action.Move),
    camera.yaw + Math.PI / 2
  );
  const velocity = Vector2.multiply(moveSpeed, direction);
  camera.position = Point3.add(camera.position, Vector3.fromVector2(velocity));
};
