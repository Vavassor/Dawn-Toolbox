import { Point3 } from "./Geometry/Point3";
import { Vector3 } from "./Geometry/Vector3";
import { TraceError } from "./TraceError";

const FILE_HEADER_TAG = "WOWOWOWO";
const FILE_VERSION = 1;

interface ChunkHeader {
  tag: string;
  byteCount: number;
}

interface FileHeader {
  tag: string;
  version: number;
  byteCount: number;
}

interface Model {
  indicies: number[];
  vertexAttributes: VertexAttributes;
}

interface Reader {
  byteIndex: number;
  dataView: DataView;
  sourceData: ArrayBuffer;
  textDecoder: TextDecoder;
}

interface Scene {
  models: Model[];
}

interface VertexAttributes {
  normals: Vector3[];
  positions: Point3[];
}

export const deserialize = (sourceData: ArrayBuffer): Scene => {
  const reader: Reader = {
    byteIndex: 0,
    dataView: new DataView(sourceData),
    sourceData,
    textDecoder: new TextDecoder("utf-8"),
  };

  const fileHeader = readFileHeader(reader);

  return {
    models: [
      {
        indicies: [],
        vertexAttributes: {
          normals: [],
          positions: [],
        },
      },
    ],
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

const skipBytes = (reader: Reader, byteCount: number) => {
  expectBytesLeft(
    reader,
    byteCount,
    `Failed skipping ${byteCount} bytes at byte index ${reader.byteIndex}.`
  );
  reader.byteIndex += byteCount;
};
