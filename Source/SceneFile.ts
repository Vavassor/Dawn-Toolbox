import { Point3 } from "./Geometry/Point3";
import { Vector3 } from "./Geometry/Vector3";
import { TraceError } from "./TraceError";
import { Rotor3 } from "./Geometry/Rotor3";

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
}

interface ChunkHeader {
  tag: string;
  byteCount: number;
}

enum ComponentType {
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

interface Material {
  textures: Texture[];
}

interface Mesh {
  indicies: number[];
  material: Material;
}

interface MeshObject {
  mesh: Mesh;
  type: "MESH";
}

interface MeshSpec {
  indexAccessorIndex: number;
  materialIndex: number;
  vertexAttributes: VertexAttributeSpec[];
}

type Object = MeshObject;

enum ObjectType {
  Mesh = "MESH",
}

interface Reader {
  byteIndex: number;
  dataView: DataView;
  sourceData: ArrayBuffer;
  textDecoder: TextDecoder;
}

interface Scene {
  materials: Material[];
  meshes: Mesh[];
  rootTransformNode: TransformNode | null;
  transformNodes: TransformNode[];
}

interface Texture {}

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

interface VertexAttributeSpec {
  accessorIndex: number;
  type: VertexAttributeType;
}

enum VertexAttributeType {
  Normal,
  Position,
  Texcoord,
}

export const deserialize = (sourceData: ArrayBuffer): Scene => {
  const reader: Reader = {
    byteIndex: 0,
    dataView: new DataView(sourceData),
    sourceData,
    textDecoder: new TextDecoder("utf-8"),
  };

  readFileHeader(reader);

  while (!haveReachedEndOfFile(reader)) {
    const chunkHeader = readChunkHeader(reader);
    switch (chunkHeader.tag) {
      case ChunkType.Accessor:
        readAccessorChunk(reader);
        break;
      case ChunkType.Buffer:
        readBufferChunk(reader);
        break;
      case ChunkType.Mesh:
        readMeshChunk(reader);
        break;
      default:
        skipBytes(reader, chunkHeader.byteCount);
        break;
    }
  }

  readFileFooter(reader);

  return {
    materials: [],
    meshes: [],
    rootTransformNode: null,
    transformNodes: [],
  };
};

const expect = (expectation: boolean, message: string) => {
  if (!expectation) {
    throw new Error(message);
  }
};

const expectBytesLeft = (
  reader: Reader,
  byteCount: number,
  message: string
) => {
  if (reader.byteIndex + byteCount > reader.sourceData.byteLength) {
    throw new Error(message);
  }
};

const haveReachedEndOfFile = (reader: Reader): boolean => {
  return reader.byteIndex === reader.sourceData.byteLength;
};

const isComponentType = (type: number): boolean => {
  switch (type) {
    case ComponentType.Float1:
    case ComponentType.Float2:
    case ComponentType.Float3:
    case ComponentType.Float4:
    case ComponentType.Uint16:
    case ComponentType.Uint8:
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

const readAccessor = (reader: Reader): Accessor => {
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

const readAccessorChunk = (reader: Reader): Accessor[] => {
  const accessorCount = readUint16(reader);

  expect(accessorCount > 0, "Accessor count must be nonzero.");

  const accessors: Accessor[] = [];
  for (let i = 0; i < accessorCount; i++) {
    const accessor = readAccessor(reader);
    accessors.push(accessor);
  }

  return accessors;
};

const readBuffer = (reader: Reader): ArrayBuffer => {
  const byteCount = readUint32(reader);
  const buffer = reader.sourceData.slice(
    reader.byteIndex,
    reader.byteIndex + byteCount
  );
  skipBytes(reader, byteCount);
  return buffer;
};

const readBufferChunk = (reader: Reader): ArrayBuffer[] => {
  const bufferCount = readUint16(reader);

  expect(bufferCount > 0, "Buffer count must be nonzero.");

  const buffers: ArrayBuffer[] = [];
  for (let i = 0; i < bufferCount; i++) {
    const buffer = readBuffer(reader);
    buffers.push(buffer);
  }

  return buffers;
};

const readChunkHeader = (reader: Reader): ChunkHeader => {
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

const readFileFooter = (reader: Reader): void => {
  // CRC - Cyclic Redundancy Check
  const crc = readUint32(reader);
  // TODO: Perform the CRC.
};

const readFileHeader = (reader: Reader): FileHeader => {
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

const readMeshChunk = (reader: Reader): MeshSpec[] => {
  const meshCount = readUint16(reader);

  expect(meshCount > 0, "Mesh count must be nonzero.");

  const meshes: MeshSpec[] = [];
  for (let i = 0; i < meshCount; i++) {
    const meshSpec = readMeshSpec(reader);
    meshes.push(meshSpec);
  }

  return meshes;
};

const readMeshSpec = (reader: Reader): MeshSpec => {
  const indexAccessorIndex = readUint16(reader);
  const materialIndex = readUint16(reader);
  const vertexAttributeCount = readUint8(reader);

  expect(vertexAttributeCount > 0, "Vertex attribute count must be nonzero.");

  const vertexAttributes: VertexAttributeSpec[] = [];
  for (let i = 0; i < vertexAttributeCount; i++) {
    const vertexAttributeSpec = readVertexAttributeSpec(reader);
    vertexAttributes.push(vertexAttributeSpec);
  }

  return {
    indexAccessorIndex,
    materialIndex,
    vertexAttributes,
  };
};

const readString = (reader: Reader, byteCount: number): string => {
  expectBytesLeft(
    reader,
    byteCount,
    `Failed reading string at byte index ${reader.byteIndex}.`
  );
  const start = reader.byteIndex;
  const end = start + byteCount;
  const uint8View = new Uint8Array(reader.sourceData.slice(start, end));
  return reader.textDecoder.decode(uint8View);
};

const readUint32 = (reader: Reader): number => {
  const bytesPerUint32 = 4;
  expectBytesLeft(
    reader,
    bytesPerUint32,
    `Failed reading uint32 at byte index ${reader.byteIndex}.`
  );
  const value = reader.dataView.getUint32(reader.byteIndex, true);
  reader.byteIndex += bytesPerUint32;
  return value;
};

const readUint16 = (reader: Reader): number => {
  const bytesPerUint16 = 2;
  expectBytesLeft(
    reader,
    bytesPerUint16,
    `Failed reading uint16 at byte index ${reader.byteIndex}.`
  );
  const value = reader.dataView.getUint16(reader.byteIndex, true);
  reader.byteIndex += bytesPerUint16;
  return value;
};

const readUint8 = (reader: Reader): number => {
  expectBytesLeft(
    reader,
    1,
    `Failed reading uint8 at byte index ${reader.byteIndex}.`
  );
  const value = reader.dataView.getUint8(reader.byteIndex);
  reader.byteIndex++;
  return value;
};

const readVertexAttributeSpec = (reader: Reader): VertexAttributeSpec => {
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

const skipBytes = (reader: Reader, byteCount: number) => {
  expectBytesLeft(
    reader,
    byteCount,
    `Failed skipping ${byteCount} bytes at byte index ${reader.byteIndex}.`
  );
  reader.byteIndex += byteCount;
};
