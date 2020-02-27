import { Color } from "./Color";

interface Colors {
  [key: string]: Color;
}

interface ColorStrings {
  [key: string]: string;
}

const parseColors = (colorStrings: ColorStrings): Colors => {
  const colors: Colors = {};
  for (const key in colorStrings) {
    colors[key] = Color.fromHexString(colorStrings[key]);
  }
  return colors;
};

export const COLORS = parseColors({
  blue: "4071b3",
  lightGreen: "abc422",
  orange: "e46b1c",
  white: "ffffff",
});
