import { times } from "./Array";
import {
  BinaryReader,
  createBinaryReader,
  expect,
  expectBytesLeft,
  expectIndexInBounds,
  haveReachedEndOfFile,
  readFloat32Array,
  readString,
  readUint16,
  readUint16Array,
  readUint32,
  readUint8,
  skipBytes,
} from "./BinaryReader";
import { Bivector3 } from "./Geometry/Bivector3";
import { Point3 } from "./Geometry/Point3";
import { Rotor3 } from "./Geometry/Rotor3";
import { Vector3 } from "./Geometry/Vector3";
import { TraceError } from "./TraceError";

const FILE_HEADER_TAG = "DWNSCENE";
const FILE_VERSION = 1;

export interface Accessor {
  buffer: ArrayBuffer;
  byteCount: number;
  byteIndex: number;
  byteStride: number;
  componentCount: number;
  componentType: ComponentType;
}

interface AccessorSpec {
  bufferIndex: number;
  byteCount: number;
  byteIndex: number;
  byteStride: number;
  componentCount: number;
  componentType: ComponentType;
}

enum ChunkType {
  Accessor = "ACCE",
  Buffer = "BUFF",
  Mesh = "MESH",
  Object = "OBJE",
  TransformNode = "TRAN",
  VertexLayout = "VERT",
}

interface ChunkHeader {
  tag: string;
  byteCount: number;
}

export enum ComponentType {
  Invalid,
  Float32,
  Int8,
  Int16,
  Int32,
  Uint8,
  Uint16,
  Uint32,
}

interface FileHeader {
  tag: string;
  version: number;
  byteCount: number;
}

export interface Mesh {
  indexAccessor: Accessor;
  vertexLayout: VertexLayout;
}

export interface MeshObject {
  mesh: Mesh;
  type: ObjectType.Mesh;
}

interface MeshSpec {
  indexAccessorIndex: number;
  materialIndex: number;
  vertexLayoutIndex: number;
}

export type Object = MeshObject;

interface ObjectSpec {
  contentIndex: number;
  type: ObjectType;
}

export enum ObjectType {
  Invalid,
  Mesh,
}

export interface Scene {
  buffers: ArrayBuffer[];
  meshes: Mesh[];
  rootTransformNodes: TransformNode[];
  transformNodes: TransformNode[];
}

export interface Transform {
  orientation: Rotor3;
  position: Point3;
  scale: Vector3;
}

export interface TransformNode {
  children: TransformNode[];
  object: Object;
  parent: TransformNode | null;
  transform: Transform;
}

interface TransformNodeSpec {
  childIndices: number[];
  objectIndex: number;
  transform: Transform;
}

export interface VertexAttribute {
  accessor: Accessor;
  type: VertexAttributeType;
}

interface VertexAttributeSpec {
  accessorIndex: number;
  type: VertexAttributeType;
}

export enum VertexAttributeType {
  Invalid,
  Color,
  Normal,
  Position,
  Texcoord,
}

export interface VertexLayout {
  vertexAttributes: VertexAttribute[];
}

interface VertexLayoutSpec {
  vertexAttributes: VertexAttributeSpec[];
}

export const deserialize = (sourceData: ArrayBuffer): Scene => {
  const reader = createBinaryReader(sourceData);

  readFileHeader(reader);

  let accessorSpecs: AccessorSpec[] = [];
  let buffers: ArrayBuffer[] = [];
  let meshSpecs: MeshSpec[] = [];
  let objectSpecs: ObjectSpec[] = [];
  let transformNodeSpecs: TransformNodeSpec[] = [];
  let vertexLayoutSpecs: VertexLayoutSpec[] = [];

  while (!haveReachedEndOfFile(reader)) {
    const chunkHeader = readChunkHeader(reader);
    switch (chunkHeader.tag) {
      case ChunkType.Accessor:
        accessorSpecs = readAccessorChunk(reader, chunkHeader);
        break;
      case ChunkType.Buffer:
        buffers = readBufferChunk(reader);
        break;
      case ChunkType.Mesh:
        meshSpecs = readMeshChunk(reader, chunkHeader);
        break;
      case ChunkType.Object:
        objectSpecs = readObjectChunk(reader, chunkHeader);
        break;
      case ChunkType.TransformNode:
        transformNodeSpecs = readTransformNodeChunk(reader);
        break;
      case ChunkType.VertexLayout:
        vertexLayoutSpecs = readVertexLayoutChunk(reader);
        break;
      default:
        skipBytes(reader, chunkHeader.byteCount);
        break;
    }
  }

  const accessors = accessorSpecs.map(spec => createAccessor(spec, buffers));
  const vertexLayouts = vertexLayoutSpecs.map(spec =>
    createVertexLayout(spec, accessors)
  );
  const meshes = meshSpecs.map(spec =>
    createMesh(spec, vertexLayouts, accessors)
  );
  const objects = objectSpecs.map(spec => createObject(spec, meshes));
  const transformNodes = transformNodeSpecs.map(spec =>
    createTransformNodeWithoutChildren(spec, objects)
  );

  resolveTransformNodeConnections(transformNodeSpecs, transformNodes);
  const rootTransformNodes = transformNodes.filter(
    transformNode => !transformNode.parent
  );

  return {
    buffers,
    meshes,
    rootTransformNodes,
    transformNodes,
  };
};

export const getElementCount = (accessor: Accessor): number => {
  const { byteCount, byteStride } = accessor;
  return byteCount / byteStride;
};

const createAccessor = (
  spec: AccessorSpec,
  buffers: ArrayBuffer[]
): Accessor => {
  const {
    bufferIndex,
    byteCount,
    byteIndex,
    byteStride,
    componentCount,
    componentType,
  } = spec;

  expectIndexInBounds(bufferIndex, buffers, "Buffer index is out of bounds.");

  const buffer = buffers[bufferIndex];

  return {
    buffer,
    byteCount,
    byteIndex,
    byteStride,
    componentCount,
    componentType,
  };
};

const createMesh = (
  spec: MeshSpec,
  vertexLayouts: VertexLayout[],
  accessors: Accessor[]
): Mesh => {
  const { indexAccessorIndex, vertexLayoutIndex } = spec;

  expectIndexInBounds(
    indexAccessorIndex,
    accessors,
    "Index accessor index is out of bounds."
  );
  expectIndexInBounds(
    vertexLayoutIndex,
    vertexLayouts,
    "Vertex layout index is out of bounds."
  );

  const indexAccessor = accessors[indexAccessorIndex];
  const vertexLayout = vertexLayouts[vertexLayoutIndex];

  return {
    indexAccessor,
    vertexLayout,
  };
};

const createObject = (spec: ObjectSpec, meshes: Mesh[]): Object => {
  const { contentIndex, type } = spec;

  switch (type) {
    case ObjectType.Mesh: {
      expectIndexInBounds(contentIndex, meshes, "Mesh index is out of bounds.");
      const mesh = meshes[contentIndex];
      return {
        mesh,
        type,
      };
    }
    default:
      throw new Error("Object type is invalid.");
  }
};

const createTransformNodeWithoutChildren = (
  spec: TransformNodeSpec,
  objects: Object[]
): TransformNode => {
  const { objectIndex, transform } = spec;

  expectIndexInBounds(objectIndex, objects, "Object index is out of bounds.");

  const object = objects[objectIndex];

  return {
    children: [],
    object,
    parent: null,
    transform,
  };
};

const createVertexAttribute = (
  spec: VertexAttributeSpec,
  accessors: Accessor[]
): VertexAttribute => {
  const { accessorIndex, type } = spec;

  expectIndexInBounds(
    accessorIndex,
    accessors,
    "Accessor index is out of bounds."
  );

  const accessor = accessors[accessorIndex];

  return {
    accessor,
    type,
  };
};

const createVertexLayout = (
  spec: VertexLayoutSpec,
  accessors: Accessor[]
): VertexLayout => {
  const vertexAttributes = spec.vertexAttributes.map(vertexAttributeSpec =>
    createVertexAttribute(vertexAttributeSpec, accessors)
  );

  return {
    vertexAttributes,
  };
};

const isComponentType = (type: number): boolean => {
  switch (type) {
    case ComponentType.Float32:
    case ComponentType.Int16:
    case ComponentType.Int32:
    case ComponentType.Int8:
    case ComponentType.Uint16:
    case ComponentType.Uint32:
    case ComponentType.Uint8:
      return true;
    default:
      return false;
  }
};

const isObjectType = (type: number): boolean => {
  switch (type) {
    case ObjectType.Mesh:
      return true;
    default:
      return false;
  }
};

const isVertexAttributeType = (type: number): boolean => {
  switch (type) {
    case VertexAttributeType.Color:
    case VertexAttributeType.Normal:
    case VertexAttributeType.Position:
    case VertexAttributeType.Texcoord:
      return true;
    default:
      return false;
  }
};

const readAccessorSpec = (reader: BinaryReader): AccessorSpec => {
  const byteCount = readUint32(reader);
  const byteIndex = readUint32(reader);
  const byteStride = readUint16(reader);
  const bufferIndex = readUint16(reader);
  const componentCount = readUint8(reader);
  const componentType = readUint8(reader);

  expect(byteCount > 0, "Byte count must be nonzero.");
  expect(byteStride > 0, "Stride must be nonzero.");
  expect(componentCount > 0, "Component count must be nonzero.");
  expect(
    isComponentType(componentType),
    `Value ${componentType} is not a valid vertex attribute component type.`
  );

  return {
    bufferIndex,
    byteCount,
    byteIndex,
    byteStride,
    componentCount,
    componentType,
  };
};

const readAccessorChunk = (
  reader: BinaryReader,
  chunkHeader: ChunkHeader
): AccessorSpec[] => {
  const bytesPerAccessor = 14;
  const accessorCount = chunkHeader.byteCount / bytesPerAccessor;

  expect(accessorCount > 0, "Accessor count must be nonzero.");

  const accessors: AccessorSpec[] = [];
  for (let i = 0; i < accessorCount; i++) {
    const accessor = readAccessorSpec(reader);
    accessors.push(accessor);
  }

  return accessors;
};

const readBuffer = (reader: BinaryReader): ArrayBuffer => {
  const byteCount = readUint32(reader);
  const buffer = reader.sourceData.slice(
    reader.byteIndex,
    reader.byteIndex + byteCount
  );
  skipBytes(reader, byteCount);
  return buffer;
};

const readBufferChunk = (reader: BinaryReader): ArrayBuffer[] => {
  const bufferCount = readUint16(reader);

  expect(bufferCount > 0, "Buffer count must be nonzero.");

  const buffers = times(bufferCount, () => readBuffer(reader));

  return buffers;
};

const readChunkHeader = (reader: BinaryReader): ChunkHeader => {
  try {
    const tag = readString(reader, 4);
    const byteCount = readUint32(reader);

    return {
      byteCount,
      tag,
    };
  } catch (error) {
    throw new TraceError(error, "Failed reading a chunk header.");
  }
};

const readFileHeader = (reader: BinaryReader): FileHeader => {
  try {
    const tag = readString(reader, 8);
    const version = readUint32(reader);
    const byteCount = readUint32(reader);

    expect(tag === FILE_HEADER_TAG, "Tag is not present.");
    expect(version === FILE_VERSION, `Version ${version} is not supported.`);
    expectBytesLeft(
      reader,
      byteCount,
      "File size doesn't match the header file size."
    );

    return {
      tag,
      version,
      byteCount,
    };
  } catch (error) {
    throw new TraceError(error, "Failed reading the file header.");
  }
};

const readMeshChunk = (
  reader: BinaryReader,
  chunkHeader: ChunkHeader
): MeshSpec[] => {
  const bytesPerMesh = 12;
  const meshCount = chunkHeader.byteCount / bytesPerMesh;

  const meshes = times(meshCount, () => readMeshSpec(reader));

  return meshes;
};

const readMeshSpec = (reader: BinaryReader): MeshSpec => {
  const indexAccessorIndex = readUint16(reader);
  const materialIndex = readUint16(reader);
  const vertexLayoutIndex = readUint16(reader);

  return {
    indexAccessorIndex,
    materialIndex,
    vertexLayoutIndex,
  };
};

const readObjectChunk = (
  reader: BinaryReader,
  chunkHeader: ChunkHeader
): ObjectSpec[] => {
  const bytesPerObject = 4;
  const objectCount = chunkHeader.byteCount / bytesPerObject;

  expect(objectCount > 0, "Object count must be nonzero.");

  const objectSpecs = times(objectCount, () => readObjectSpec(reader));

  return objectSpecs;
};

const readObjectSpec = (reader: BinaryReader): ObjectSpec => {
  const contentIndex = readUint16(reader);
  const type = readUint8(reader);

  expect(isObjectType(type), `Value ${type} is not a valid object type.`);

  return {
    contentIndex,
    type,
  };
};

const readTransformNodeChunk = (reader: BinaryReader): TransformNodeSpec[] => {
  const transformNodeCount = readUint16(reader);

  expect(transformNodeCount > 0, "Transform node count must be nonzero.");

  const transformNodeSpecs = times(transformNodeCount, () =>
    readTransformNodeSpec(reader)
  );

  return transformNodeSpecs;
};

const readTransformNodeSpec = (reader: BinaryReader): TransformNodeSpec => {
  const orientationValues = readFloat32Array(reader, 4);
  const positionValues = readFloat32Array(reader, 3);
  const scaleValues = readFloat32Array(reader, 3);
  const objectIndex = readUint16(reader);
  const childIndexCount = readUint16(reader);
  const childIndices = readUint16Array(reader, childIndexCount);

  const transform: Transform = {
    orientation: new Rotor3(
      orientationValues[0],
      new Bivector3(orientationValues.slice(1))
    ),
    position: new Point3(positionValues),
    scale: new Vector3(scaleValues),
  };

  return {
    childIndices,
    objectIndex,
    transform,
  };
};

const readVertexAttributeSpec = (reader: BinaryReader): VertexAttributeSpec => {
  const accessorIndex = readUint16(reader);
  const type = readUint8(reader);

  expect(
    isVertexAttributeType(type),
    `Value ${type} is not a valid vertex attribute type.`
  );

  return {
    accessorIndex,
    type,
  };
};

const readVertexLayoutChunk = (reader: BinaryReader): VertexLayoutSpec[] => {
  const vertexLayoutCount = readUint16(reader);

  expect(vertexLayoutCount > 0, "Vertex layout count must be nonzero.");

  const vertexLayouts = times(vertexLayoutCount, () =>
    readVertexLayoutSpec(reader)
  );

  return vertexLayouts;
};

const readVertexLayoutSpec = (reader: BinaryReader): VertexLayoutSpec => {
  const vertexAttributeCount = readUint16(reader);

  expect(vertexAttributeCount > 0, "Vertex attribute count must be nonzero.");

  const vertexAttributes = times(vertexAttributeCount, () =>
    readVertexAttributeSpec(reader)
  );

  return {
    vertexAttributes,
  };
};

const resolveTransformNodeConnections = (
  specs: TransformNodeSpec[],
  transformNodes: TransformNode[]
) => {
  for (let i = 0; i < transformNodes.length; i++) {
    const spec = specs[i];
    const transformNode = transformNodes[i];
    transformNode.children = spec.childIndices.map(childIndex => {
      expectIndexInBounds(
        childIndex,
        transformNodes,
        "Transform node child index is out of bounds."
      );
      const child = transformNodes[childIndex];
      child.parent = transformNode;
      return child;
    });
  }
};
