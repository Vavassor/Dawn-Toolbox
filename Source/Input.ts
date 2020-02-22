import { Vector2 } from "./Geometry/Vector2";

type AxisDirection = "NEGATIVE_X" | "NEGATIVE_Y" | "POSITIVE_X" | "POSITIVE_Y";

interface KeyMappingAxis {
  direction: AxisDirection;
  index: number;
  key: KeyboardEventKey;
  type: "AXIS";
}

interface KeyMappingButton {
  key: KeyboardEventKey;
  type: "BUTTON";
}

export type KeyMapping = KeyMappingAxis | KeyMappingButton;

export interface InputState {
  axes: Vector2[];
  isKeyDownByKey: Map<KeyboardEventKey, boolean>;
  keyMappings: KeyMapping[];
  pointer: {
    delta: Vector2;
  };
}

type KeyboardEventKey =
  | "a"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "d"
  | "s"
  | "w";

export const createInputState = (keyMappings: KeyMapping[]): InputState => {
  return {
    axes: [Vector2.zero()],
    isKeyDownByKey: createIsKeyDownByKey(keyMappings),
    keyMappings,
    pointer: {
      delta: Vector2.zero(),
    },
  };
};

export const handleKeyDown = (input: InputState, eventKey: string) => {
  const { isKeyDownByKey } = input;
  const key = eventKey as KeyboardEventKey;
  if (isKeyDownByKey.has(key)) {
    isKeyDownByKey.set(key, true);
  }
};

export const handleKeyUp = (input: InputState, eventKey: string) => {
  const { isKeyDownByKey } = input;
  const key = eventKey as KeyboardEventKey;
  if (isKeyDownByKey.has(key)) {
    isKeyDownByKey.set(key, false);
  }
};

export const resetInput = (input: InputState) => {
  const { delta } = input.pointer;
  delta.x = 0;
  delta.y = 0;
};

export const updateInput = (input: InputState) => {
  const { isKeyDownByKey, keyMappings } = input;

  const axes = new Array<Vector2>(1).fill(Vector2.zero());

  for (const keyMapping of keyMappings) {
    const { key } = keyMapping;

    if (isKeyDownByKey.get(key)) {
      switch (keyMapping.type) {
        case "AXIS":
          const { direction, index } = keyMapping;
          const component = getAxisComponent(direction);
          const signedOne = getAxisSignedOne(direction);
          axes[index].elements[component] += signedOne;
          break;

        case "BUTTON":
          break;
      }
    }
  }

  input.axes = axes.map(Vector2.normalizeOrZero);
};

const createIsKeyDownByKey = (
  keyMappings: KeyMapping[]
): Map<KeyboardEventKey, boolean> => {
  const isKeyDownByKey = new Map<KeyboardEventKey, boolean>();
  for (const keyMapping of keyMappings) {
    isKeyDownByKey.set(keyMapping.key, false);
  }
  return isKeyDownByKey;
};

const getAxisComponent = (direction: AxisDirection): number => {
  switch (direction) {
    case "NEGATIVE_X":
    case "POSITIVE_X":
      return 0;
    case "NEGATIVE_Y":
    case "POSITIVE_Y":
      return 1;
  }
};

const getAxisSignedOne = (direction: AxisDirection): number => {
  switch (direction) {
    case "NEGATIVE_X":
    case "NEGATIVE_Y":
      return -1;
    case "POSITIVE_X":
    case "POSITIVE_Y":
      return 1;
  }
};
