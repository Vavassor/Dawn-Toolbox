import { Point3 } from "./Geometry/Point3";
import { Vector3 } from "./Geometry/Vector3";
import { TraceError } from "./TraceError";
import { Rotor3 } from "./Geometry/Rotor3";
import { Bivector3 } from "./Geometry/Bivector3";
import {
  BinaryReader,
  expect,
  expectBytesLeft,
  haveReachedEndOfFile,
  readFloat32Array,
  readString,
  readUint16,
  readUint16Array,
  readUint32,
  readUint8,
  skipBytes,
} from "./BinaryReader";

const FILE_HEADER_TAG = "DWNSCENE";
const FILE_VERSION = 1;

interface Accessor {
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

enum ComponentType {
  Invalid,
  Float1,
  Float2,
  Float3,
  Float4,
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

interface Mesh {
  indicies: number[];
}

interface MeshObject {
  mesh: Mesh;
  type: ObjectType.Mesh;
}

interface MeshSpec {
  indexAccessorIndex: number;
  materialIndex: number;
  vertexLayoutIndex: number;
}

type Object = MeshObject;

interface ObjectSpec {
  contentIndex: number;
  type: ObjectType;
}

enum ObjectType {
  Invalid,
  Mesh,
}

interface Scene {
  meshes: Mesh[];
  rootTransformNode: TransformNode | null;
  transformNodes: TransformNode[];
}

interface Transform {
  orientation: Rotor3;
  position: Point3;
  scale: Vector3;
}

interface TransformNode {
  children: TransformNode[];
  object: Object;
  transform: Transform;
}

interface TransformNodeSpec {
  childIndices: number[];
  objectIndex: number;
  transform: Transform;
}

interface VertexAttributeSpec {
  accessorIndex: number;
  type: VertexAttributeType;
}

enum VertexAttributeType {
  Invalid,
  Normal,
  Position,
  Texcoord,
}

interface VertexLayoutSpec {
  vertexAttributes: VertexAttributeSpec[];
}

export const deserialize = (sourceData: ArrayBuffer): Scene => {
  const reader: BinaryReader = {
    byteIndex: 0,
    dataView: new DataView(sourceData),
    sourceData,
    textDecoder: new TextDecoder("utf-8"),
  };

  readFileHeader(reader);

  let accessors: Accessor[] = [];
  let buffers: ArrayBuffer[] = [];
  let meshSpecs: MeshSpec[] = [];
  let objectSpecs: ObjectSpec[] = [];
  let transformNodeSpecs: TransformNodeSpec[] = [];
  let vertexLayoutSpecs: VertexLayoutSpec[] = [];

  while (!haveReachedEndOfFile(reader)) {
    const chunkHeader = readChunkHeader(reader);
    switch (chunkHeader.tag) {
      case ChunkType.Accessor:
        accessors = readAccessorChunk(reader, chunkHeader);
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

  return {
    meshes: [],
    rootTransformNode: null,
    transformNodes: [],
  };
};

const isComponentType = (type: number): boolean => {
  switch (type) {
    case ComponentType.Float1:
    case ComponentType.Float2:
    case ComponentType.Float3:
    case ComponentType.Float4:
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
    case VertexAttributeType.Normal:
    case VertexAttributeType.Position:
    case VertexAttributeType.Texcoord:
      return true;
    default:
      return false;
  }
};

const readAccessor = (reader: BinaryReader): Accessor => {
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
): Accessor[] => {
  const bytesPerAccessor = 14;
  const accessorCount = chunkHeader.byteCount / bytesPerAccessor;

  expect(accessorCount > 0, "Accessor count must be nonzero.");

  const accessors: Accessor[] = [];
  for (let i = 0; i < accessorCount; i++) {
    const accessor = readAccessor(reader);
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

  const buffers: ArrayBuffer[] = [];
  for (let i = 0; i < bufferCount; i++) {
    const buffer = readBuffer(reader);
    buffers.push(buffer);
  }

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

  const meshes: MeshSpec[] = [];
  for (let i = 0; i < meshCount; i++) {
    const meshSpec = readMeshSpec(reader);
    meshes.push(meshSpec);
  }

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

  const objectSpecs: ObjectSpec[] = [];
  for (let i = 0; i < objectCount; i++) {
    const spec = readObjectSpec(reader);
    objectSpecs.push(spec);
  }

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

  const transformNodeSpecs: TransformNodeSpec[] = [];
  for (let i = 0; i < transformNodeCount; i++) {
    const spec = readTransformNodeSpec(reader);
    transformNodeSpecs.push(spec);
  }

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

  const vertexLayouts: VertexLayoutSpec[] = [];
  for (let i = 0; i < vertexLayoutCount; i++) {
    const vertexLayoutSpec = readVertexLayoutSpec(reader);
    vertexLayouts.push(vertexLayoutSpec);
  }

  return vertexLayouts;
};

const readVertexLayoutSpec = (reader: BinaryReader): VertexLayoutSpec => {
  const vertexAttributeCount = readUint16(reader);

  expect(vertexAttributeCount > 0, "Vertex attribute count must be nonzero.");

  const vertexAttributes: VertexAttributeSpec[] = [];
  for (let i = 0; i < vertexAttributeCount; i++) {
    const vertexAttributeSpec = readVertexAttributeSpec(reader);
    vertexAttributes.push(vertexAttributeSpec);
  }

  return {
    vertexAttributes,
  };
};
