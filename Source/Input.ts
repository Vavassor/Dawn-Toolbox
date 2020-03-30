import { Vector2 } from "./Geometry/Vector2";
import { limitUnitLength, clamp } from "./Clamp";

export enum Action {
  Move = "MOVE",
}

export enum Axis1dDirection {
  Negative = "NEGATIVE",
  Positive = "POSITIVE",
}

export enum Axis2dDirection {
  NegativeX = "NEGATIVE_X",
  NegativeY = "NEGATIVE_Y",
  PositiveX = "POSITIVE_X",
  PositiveY = "POSITIVE_Y",
}

interface ButtonState {
  framesDown: number;
}

interface KeyMappingAxis1d {
  action: Action;
  direction: Axis1dDirection;
  key: KeyboardEventKey;
  type: "AXIS_1D";
}

interface KeyMappingAxis2d {
  action: Action;
  direction: Axis2dDirection;
  key: KeyboardEventKey;
  type: "AXIS_2D";
}

interface KeyMappingButton {
  action: Action;
  key: KeyboardEventKey;
  type: "BUTTON";
}

export enum KeyMappingType {
  Axis1d = "AXIS_1D",
  Axis2d = "AXIS_2D",
  Button = "BUTTON",
}

export type KeyMapping = KeyMappingAxis1d | KeyMappingAxis2d | KeyMappingButton;

export interface InputState {
  axis1dsByAction: Map<Action, number>;
  axis2dsByAction: Map<Action, Vector2>;
  buttonsByAction: Map<Action, ButtonState>;
  isKeyDownByKey: Map<KeyboardEventKey, boolean>;
  keyMappings: KeyMapping[];
  pointer: {
    delta: Vector2;
    nextDelta: Vector2;
  };
}

export enum KeyboardEventKey {
  A = "a",
  ArrowDown = "ArrowDown",
  ArrowLeft = "ArrowLeft",
  ArrowRight = "ArrowRight",
  ArrowUp = "ArrowUp",
  D = "d",
  S = "s",
  W = "w",
}

export const createInputState = (keyMappings: KeyMapping[]): InputState => {
  return {
    axis1dsByAction: createAxis1dsByAction(keyMappings),
    axis2dsByAction: createAxis2dsByAction(keyMappings),
    buttonsByAction: createButtonsByAction(keyMappings),
    isKeyDownByKey: createIsKeyDownByKey(keyMappings),
    keyMappings,
    pointer: {
      delta: Vector2.zero(),
      nextDelta: Vector2.zero(),
    },
  };
};

export const getButtonDown = (input: InputState, action: Action): boolean => {
  const button = input.buttonsByAction.get(action);
  return button.framesDown > 0;
};

export const getButtonTapped = (input: InputState, action: Action): boolean => {
  const button = input.buttonsByAction.get(action);
  return button.framesDown === 1;
};

export const getAxis1d = (input: InputState, action: Action): number => {
  return input.axis1dsByAction.get(action);
};

export const getAxis2d = (input: InputState, action: Action): Vector2 => {
  return input.axis2dsByAction.get(action);
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

export const handleMouseMove = (input: InputState, delta: Vector2) => {
  input.pointer.nextDelta = delta;
};

export const updateInput = (input: InputState) => {
  const { keyMappings } = input;

  resetInput(input);

  for (const keyMapping of keyMappings) {
    switch (keyMapping.type) {
      case KeyMappingType.Axis1d:
        updateAxis1d(input, keyMapping);
        break;
      case KeyMappingType.Axis2d:
        updateAxis2d(input, keyMapping);
        break;
      case KeyMappingType.Button: {
        updateButton(input, keyMapping);
        break;
      }
    }
  }

  applyLimits(input);
};

const applyLimits = (input: InputState) => {
  const { axis1dsByAction, axis2dsByAction } = input;
  Array.from(axis1dsByAction.entries()).forEach(([action, axis]) => {
    axis1dsByAction.set(action, clamp(axis, -1, 1));
  });
  Array.from(axis2dsByAction.entries()).forEach(([action, axis]) => {
    axis2dsByAction.set(action, limitUnitLength(axis));
  });
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

const createAxis1dsByAction = (
  keyMappings: KeyMapping[]
): Map<Action, number> => {
  const axis1dsByAction = new Map<Action, number>();
  const axis1dKeyMappings = keyMappings.filter(
    keyMapping => keyMapping.type === KeyMappingType.Axis2d
  );
  const mappedActions = getMappedActions(axis1dKeyMappings);
  for (const action of mappedActions) {
    axis1dsByAction.set(action, 0);
  }
  return axis1dsByAction;
};

const createAxis2dsByAction = (
  keyMappings: KeyMapping[]
): Map<Action, Vector2> => {
  const axis2dsByAction = new Map<Action, Vector2>();
  const axis2dKeyMappings = keyMappings.filter(
    keyMapping => keyMapping.type === KeyMappingType.Axis2d
  );
  const mappedActions = getMappedActions(axis2dKeyMappings);
  for (const action of mappedActions) {
    axis2dsByAction.set(action, Vector2.zero());
  }
  return axis2dsByAction;
};

const createButtonsByAction = (
  keyMappings: KeyMapping[]
): Map<Action, ButtonState> => {
  const buttonsByAction = new Map<Action, ButtonState>();
  const buttonKeyMappings = keyMappings.filter(
    keyMapping => keyMapping.type === KeyMappingType.Button
  );
  const mappedActions = getMappedActions(buttonKeyMappings);
  for (const action of mappedActions) {
    buttonsByAction.set(action, { framesDown: 0 });
  }
  return buttonsByAction;
};

const getMappedActions = (keyMappings: KeyMapping[]): Action[] => {
  return Array.from(new Set(keyMappings.map(keyMapping => keyMapping.action)));
};

const getAxis2dComponent = (direction: Axis2dDirection): number => {
  switch (direction) {
    case Axis2dDirection.NegativeX:
    case Axis2dDirection.PositiveX:
      return 0;
    case Axis2dDirection.NegativeY:
    case Axis2dDirection.PositiveY:
      return 1;
  }
};

const getAxis1dSignedOne = (direction: Axis1dDirection): number => {
  switch (direction) {
    case Axis1dDirection.Negative:
      return -1;
    case Axis1dDirection.Positive:
      return 1;
  }
};

const getAxis2dSignedOne = (direction: Axis2dDirection): number => {
  switch (direction) {
    case Axis2dDirection.NegativeX:
    case Axis2dDirection.NegativeY:
      return -1;
    case Axis2dDirection.PositiveX:
    case Axis2dDirection.PositiveY:
      return 1;
  }
};

const resetInput = (input: InputState) => {
  const { axis1dsByAction, axis2dsByAction, pointer } = input;

  pointer.delta = pointer.nextDelta;
  pointer.nextDelta = Vector2.zero();

  Array.from(axis1dsByAction.keys()).forEach(action =>
    axis1dsByAction.set(action, 0)
  );
  Array.from(axis2dsByAction.keys()).forEach(action =>
    axis2dsByAction.set(action, Vector2.zero())
  );
};

const updateAxis1d = (input: InputState, keyMapping: KeyMappingAxis1d) => {
  const { axis1dsByAction, isKeyDownByKey } = input;
  const { key } = keyMapping;
  if (isKeyDownByKey.get(key)) {
    const { action, direction } = keyMapping;
    const signedOne = getAxis1dSignedOne(direction);
    const axis = axis1dsByAction.get(action);
    axis1dsByAction.set(action, axis + signedOne);
  }
};

const updateAxis2d = (input: InputState, keyMapping: KeyMappingAxis2d) => {
  const { axis2dsByAction, isKeyDownByKey } = input;
  const { key } = keyMapping;
  if (isKeyDownByKey.get(key)) {
    const { action, direction } = keyMapping;
    const component = getAxis2dComponent(direction);
    const signedOne = getAxis2dSignedOne(direction);
    const axis = axis2dsByAction.get(action);
    axis.elements[component] += signedOne;
  }
};

const updateButton = (input: InputState, keyMapping: KeyMappingButton) => {
  const { buttonsByAction, isKeyDownByKey } = input;
  const { action, key } = keyMapping;
  const button = buttonsByAction.get(action);
  if (isKeyDownByKey.get(key)) {
    button.framesDown++;
  } else {
    button.framesDown = 0;
  }
};
