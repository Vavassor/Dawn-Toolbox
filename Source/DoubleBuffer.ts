export class DoubleBuffer<T> {
  buffers: T[];
  frameIndex: number;

  constructor(front: T, back: T) {
    this.buffers = [front, back];
    this.frameIndex = 0;
  }

  get back(): T {
    return this.buffers[this.frameIndex ^ 1];
  }

  get front(): T {
    return this.buffers[this.frameIndex];
  }

  set back(value: T) {
    this.buffers[this.frameIndex ^ 1] = value;
  }

  set front(value: T) {
    this.buffers[this.frameIndex] = value;
  }

  flip(): void {
    this.frameIndex ^= 1;
  }
}
