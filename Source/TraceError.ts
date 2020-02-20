export class TraceError extends Error {
  private source: Error;

  constructor(source: Error, ...params: any[]) {
    super(...params);
    this.name = "TraceError";
    this.source = source;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TraceError);
    }
  }

  toString(): string {
    return super.toString() + this.source.toString();
  }
}
