export interface KeyMapping {
  left: string[];
  right: string[];
  softDrop: string[];
  hardDrop: string[];
  rotateClockwise: string[];
  rotateCounterclockwise: string[];
  hold: string[];
  undo: string[];
  reset: string[];
}

export interface GamepadMapping {
  left: number[];
  right: number[];
  softDrop: number[];
  hardDrop: number[];
  rotateClockwise: number[];
  rotateCounterclockwise: number[];
  hold: number[];
  undo: number[];
  reset: number[];
  useLeftStick: boolean;
  useRightStick: boolean;
}

export interface KeyConfig {
  keyboard: KeyMapping;
  gamepad: GamepadMapping;
  das: number; // Delayed Auto Shift (frames)
  arr: number; // Auto Repeat Rate (frames)
  softDropSpeed: number; // cells per second
}

export const DEFAULT_KEY_CONFIG: KeyConfig = {
  keyboard: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: ['Space', ' ', 'ArrowUp'],
    rotateClockwise: ['x', 'X', 'ArrowUp'],
    rotateCounterclockwise: ['z', 'Z', 'Control'],
    hold: ['c', 'C', 'Shift'],
    undo: ['Backspace'],
    reset: ['r', 'R'],
  },
  gamepad: {
    left: [14], // D-pad left
    right: [15], // D-pad right
    softDrop: [13], // D-pad down
    hardDrop: [12], // D-pad up
    rotateClockwise: [1], // Circle button
    rotateCounterclockwise: [0], // Cross button
    hold: [4], // L1
    undo: [5], // R1
    reset: [9], // Options
    useLeftStick: true,
    useRightStick: false,
  },
  das: 10, // frames (167ms at 60fps)
  arr: 2,  // frames (33ms at 60fps)
  softDropSpeed: 20, // cells per second
};

export interface KeyConfigAction {
  type: 'keyboard' | 'gamepad';
  action: keyof KeyMapping;
  key?: string;
  button?: number;
  index?: number;
}