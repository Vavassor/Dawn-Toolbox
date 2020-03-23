import { times } from "./Array";

export interface BinaryReader {
  byteIndex: number;
  dataView: DataView;
  sourceData: ArrayBuffer;
  textDecoder: TextDecoder;
}

export const createBinaryReader = (sourceData: ArrayBuffer): BinaryReader => {
  return {
    byteIndex: 0,
    dataView: new DataView(sourceData),
    sourceData,
    textDecoder: new TextDecoder("utf-8"),
  };
};

export const expect = (expectation: boolean, message: string) => {
  if (!expectation) {
    throw new Error(message);
  }
};

export const expectBytesLeft = (
  reader: BinaryReader,
  byteCount: number,
  message: string
) => {
  if (reader.byteIndex + byteCount > reader.sourceData.byteLength) {
    throw new Error(message);
  }
};

export function expectIndexInBounds<T>(
  index: number,
  array: T[],
  message: string
) {
  if (index < 0 || index >= array.length) {
    throw new Error(message);
  }
}

export const haveReachedEndOfFile = (reader: BinaryReader): boolean => {
  return reader.byteIndex === reader.sourceData.byteLength;
};

export const readFloat32Array = (
  reader: BinaryReader,
  count: number
): number[] => {
  const bytesPerFloat32 = 4;
  const sizeInBytes = bytesPerFloat32 * count;

  expectBytesLeft(
    reader,
    sizeInBytes,
    `Failed reading float32 array at byte index ${reader.byteIndex}.`
  );

  const values = times(count, index => {
    const byteIndex = bytesPerFloat32 * index + reader.byteIndex;
    return reader.dataView.getFloat32(byteIndex, true);
  });

  reader.byteIndex += sizeInBytes;

  return values;
};

export const readString = (reader: BinaryReader, byteCount: number): string => {
  expectBytesLeft(
    reader,
    byteCount,
    `Failed reading string at byte index ${reader.byteIndex}.`
  );
  const start = reader.byteIndex;
  const end = start + byteCount;
  const uint8View = new Uint8Array(reader.sourceData.slice(start, end));
  const result = reader.textDecoder.decode(uint8View);
  reader.byteIndex += byteCount;
  return result;
};

export const readUint16 = (reader: BinaryReader): number => {
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

export const readUint16Array = (
  reader: BinaryReader,
  count: number
): number[] => {
  const bytesPerUint16 = 2;
  const sizeInBytes = bytesPerUint16 * count;

  expectBytesLeft(
    reader,
    sizeInBytes,
    `Failed reading uint16 array at byte index ${reader.byteIndex}.`
  );

  const values = times(count, index => {
    const byteIndex = bytesPerUint16 * index + reader.byteIndex;
    return reader.dataView.getUint16(byteIndex, true);
  });

  reader.byteIndex += sizeInBytes;

  return values;
};

export const readUint32 = (reader: BinaryReader): number => {
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

export const readUint8 = (reader: BinaryReader): number => {
  expectBytesLeft(
    reader,
    1,
    `Failed reading uint8 at byte index ${reader.byteIndex}.`
  );
  const value = reader.dataView.getUint8(reader.byteIndex);
  reader.byteIndex++;
  return value;
};

export const skipBytes = (reader: BinaryReader, byteCount: number) => {
  expectBytesLeft(
    reader,
    byteCount,
    `Failed skipping ${byteCount} bytes at byte index ${reader.byteIndex}.`
  );
  reader.byteIndex += byteCount;
};
