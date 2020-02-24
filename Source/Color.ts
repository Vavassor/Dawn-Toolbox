import { isAlmostEqual } from "./Float";

export class Color {
  /**
   * The components in the order red, green, blue, and alpha. Each component is
   * in the range [0, 1].
   */
  components: number[];

  constructor(components: number[] = [0, 0, 0, 0]) {
    this.components = components;
  }

  get a(): number {
    return this.components[3];
  }

  get b(): number {
    return this.components[2];
  }

  get g(): number {
    return this.components[1];
  }

  get r(): number {
    return this.components[0];
  }

  set a(a: number) {
    this.components[3] = a;
  }

  set b(b: number) {
    this.components[2] = b;
  }

  set g(g: number) {
    this.components[1] = g;
  }

  set r(r: number) {
    this.components[0] = r;
  }

  toString(): string {
    return `(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  static fromHexString(hex: string): Color {
    const integer = parseInt(hex, 16);
    const alpha = hex.length === 8 ? ((integer >> 24) & 0xff) / 255 : 1;
    const red = ((integer >> 16) & 0xff) / 255;
    const green = ((integer >> 8) & 0xff) / 255;
    const blue = (integer & 0xff) / 255;
    return new Color([red, green, blue, alpha]);
  }

  static isAlmostEqual(a: Color, b: Color, tolerance?: number): boolean {
    return a.components.every((component, index) =>
      isAlmostEqual(component, b.components[index], tolerance)
    );
  }

  static isExactlyEqual(a: Color, b: Color): boolean {
    return a.components.every(
      (component, index) => component === b.components[index]
    );
  }

  static opaqueBlack(): Color {
    return new Color([0, 0, 0, 1]);
  }

  static opaqueWhite(): Color {
    return new Color([1, 1, 1, 1]);
  }

  static toRgbaInteger(color: Color): number {
    const red = Math.floor(255 * color.r);
    const green = Math.floor(255 * color.g);
    const blue = Math.floor(255 * color.b);
    const alpha = Math.floor(255 * color.a);
    return (alpha << 24) | (blue << 16) | (green << 8) | red;
  }

  static transparentBlack(): Color {
    return new Color([0, 0, 0, 0]);
  }
}
