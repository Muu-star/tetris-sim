export interface GamepadState {
  connected: boolean;
  buttons: {
    cross: boolean;      // Button 0 - X button (left rotation)
    circle: boolean;     // Button 1 - Circle button (right rotation)
    square: boolean;     // Button 2 - Square button
    triangle: boolean;   // Button 3 - Triangle button
    l1: boolean;         // Button 4 - L1 (hold)
    r1: boolean;         // Button 5 - R1 (undo)
    l2: boolean;         // Button 6 - L2
    r2: boolean;         // Button 7 - R2
    share: boolean;      // Button 8 - Share
    options: boolean;    // Button 9 - Options (reset)
    l3: boolean;         // Button 10 - L3
    r3: boolean;         // Button 11 - R3
    up: boolean;         // Button 12 - D-pad up (hard drop)
    down: boolean;       // Button 13 - D-pad down (soft drop)
    left: boolean;       // Button 14 - D-pad left
    right: boolean;      // Button 15 - D-pad right
    ps: boolean;         // Button 16 - PS button
    touchpad: boolean;   // Button 17 - Touchpad
  };
  axes: {
    leftX: number;       // Axis 0
    leftY: number;       // Axis 1
    rightX: number;      // Axis 2
    rightY: number;      // Axis 3
  };
}

import type { GamepadMapping } from '../lib/keyconfig/types';

export interface GamepadHandler {
  update(deltaTime: number): void;
  getButtonPresses(): Set<string>;
  getButtonReleases(): Set<string>;
  isConnected(): boolean;
  updateButtonMapping(mapping: GamepadMapping): void;
  updateTimings(das: number, arr: number): void;
}

interface ButtonTiming {
  heldTime: number;
  lastRepeat: number;
  initialPress: boolean;
}

class GamepadHandlerImpl implements GamepadHandler {
  private gamepadIndex: number | null = null;
  private previousState: GamepadState | null = null;
  private currentState: GamepadState | null = null;
  private deadzone = 0.3;
  private buttonTimings: Map<string, ButtonTiming> = new Map();
  private das = 10; // frames (167ms at 60fps)
  private arr = 2;  // frames (33ms at 60fps)
  private frameTime = 1000 / 60; // 60fps in milliseconds
  private buttonMapping: GamepadMapping | null = null;
  private buttonPresses: Set<string> = new Set();
  private buttonReleases: Set<string> = new Set();

  constructor() {
    this.setupEventListeners();
  }
  
  updateButtonMapping(mapping: GamepadMapping): void {
    this.buttonMapping = mapping;
  }
  
  updateTimings(das: number, arr: number): void {
    this.das = das;
    this.arr = arr;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        this.previousState = null;
      }
    });
  }

  getState(): GamepadState | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return null;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = this.gamepadIndex !== null ? gamepads[this.gamepadIndex] : null;

    if (!gamepad) {
      // Try to find any connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.gamepadIndex = i;
          break;
        }
      }
      
      if (this.gamepadIndex === null) {
        return null;
      }
    }

    if (this.gamepadIndex === null) {
      return null;
    }
    
    const currentGamepad = gamepads[this.gamepadIndex];
    if (!currentGamepad) {
      return null;
    }

    return {
      connected: true,
      buttons: {
        cross: currentGamepad.buttons[0]?.pressed ?? false,
        circle: currentGamepad.buttons[1]?.pressed ?? false,
        square: currentGamepad.buttons[2]?.pressed ?? false,
        triangle: currentGamepad.buttons[3]?.pressed ?? false,
        l1: currentGamepad.buttons[4]?.pressed ?? false,
        r1: currentGamepad.buttons[5]?.pressed ?? false,
        l2: currentGamepad.buttons[6]?.pressed ?? false,
        r2: currentGamepad.buttons[7]?.pressed ?? false,
        share: currentGamepad.buttons[8]?.pressed ?? false,
        options: currentGamepad.buttons[9]?.pressed ?? false,
        l3: currentGamepad.buttons[10]?.pressed ?? false,
        r3: currentGamepad.buttons[11]?.pressed ?? false,
        up: currentGamepad.buttons[12]?.pressed ?? false,
        down: currentGamepad.buttons[13]?.pressed ?? false,
        left: currentGamepad.buttons[14]?.pressed ?? false,
        right: currentGamepad.buttons[15]?.pressed ?? false,
        ps: currentGamepad.buttons[16]?.pressed ?? false,
        touchpad: currentGamepad.buttons[17]?.pressed ?? false,
      },
      axes: {
        leftX: this.applyDeadzone(currentGamepad.axes[0] ?? 0),
        leftY: this.applyDeadzone(currentGamepad.axes[1] ?? 0),
        rightX: this.applyDeadzone(currentGamepad.axes[2] ?? 0),
        rightY: this.applyDeadzone(currentGamepad.axes[3] ?? 0),
      }
    };
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) {
      return 0;
    }
    return value;
  }

  update(deltaTime: number): void {
    // Store previous state
    this.previousState = this.currentState;
    
    // Get new state
    this.currentState = this.getState();
    
    // Clear previous frame's presses and releases
    this.buttonPresses.clear();
    this.buttonReleases.clear();
    
    if (!this.currentState) {
      this.previousState = null;
      return;
    }

    // Detect button presses and releases
    this.detectButtonChanges();
    
    // Update button timings for DAS/ARR
    this.updateButtonTiming('left', this.currentState.buttons.left || this.currentState.axes.leftX < -0.5, deltaTime);
    this.updateButtonTiming('right', this.currentState.buttons.right || this.currentState.axes.leftX > 0.5, deltaTime);
    this.updateButtonTiming('softDrop', this.currentState.buttons.down || this.currentState.axes.leftY > 0.5, deltaTime);
  }

  private detectButtonChanges(): void {
    if (!this.currentState || !this.previousState) {
      return;
    }

    // Use custom button mapping if available
    if (this.buttonMapping) {
      // Check each action's mapped buttons
      for (const [action, buttons] of Object.entries(this.buttonMapping)) {
        if (action === 'useLeftStick' || action === 'useRightStick') continue;
        
        const buttonList = buttons as number[];
        for (const buttonIndex of buttonList) {
          const buttonName = this.getButtonName(buttonIndex);
          const isPressed = this.currentState.buttons[buttonName];
          const wasPressed = this.previousState.buttons[buttonName];
          
          // For movement actions, handle with DAS/ARR
          if (['left', 'right', 'softDrop'].includes(action)) {
            // DAS/ARR is handled separately in updateButtonTiming
            continue;
          }
          
          // Instant actions - detect press
          if (isPressed && !wasPressed) {
            this.buttonPresses.add(action);
          }
          
          // Detect release
          if (!isPressed && wasPressed) {
            this.buttonReleases.add(action);
          }
        }
      }
      
      // Handle analog sticks if enabled
      if (this.buttonMapping.useLeftStick) {
        // Hard drop on stick up
        if (this.currentState.axes.leftY < -0.5 && this.previousState.axes.leftY >= -0.5) {
          this.buttonPresses.add('hardDrop');
        }
        
        // Detect soft drop release for analog stick
        const wasDownStick = this.previousState.axes.leftY > 0.5;
        const isDownStick = this.currentState.axes.leftY > 0.5;
        if (wasDownStick && !isDownStick) {
          this.buttonReleases.add('softDrop');
        }
      }
    } else {
      // Default mapping
      // Instant button presses
      if (this.currentState.buttons.up && !this.previousState.buttons.up) {
        this.buttonPresses.add('hardDrop');
      }
      if (this.currentState.buttons.circle && !this.previousState.buttons.circle) {
        this.buttonPresses.add('rotateClockwise');
      }
      if (this.currentState.buttons.cross && !this.previousState.buttons.cross) {
        this.buttonPresses.add('rotateCounterclockwise');
      }
      if (this.currentState.buttons.l1 && !this.previousState.buttons.l1) {
        this.buttonPresses.add('hold');
      }
      if (this.currentState.buttons.r1 && !this.previousState.buttons.r1) {
        this.buttonPresses.add('undo');
      }
      if (this.currentState.buttons.options && !this.previousState.buttons.options) {
        this.buttonPresses.add('reset');
      }
      
      // Analog stick hard drop
      if (this.currentState.axes.leftY < -0.5 && this.previousState.axes.leftY >= -0.5) {
        this.buttonPresses.add('hardDrop');
      }
      
      // Detect soft drop release
      const wasDown = this.previousState.buttons.down || this.previousState.axes.leftY > 0.5;
      const isDown = this.currentState.buttons.down || this.currentState.axes.leftY > 0.5;
      if (wasDown && !isDown) {
        this.buttonReleases.add('softDrop');
      }
    }
  }

  private updateButtonTiming(button: string, isPressed: boolean, deltaTime: number): void {
    if (isPressed) {
      if (!this.buttonTimings.has(button)) {
        // Button just pressed
        this.buttonTimings.set(button, {
          heldTime: 0,
          lastRepeat: 0,
          initialPress: true
        });
      } else {
        // Button held
        const timing = this.buttonTimings.get(button)!;
        timing.heldTime += deltaTime;
      }
    } else {
      // Button released
      this.buttonTimings.delete(button);
    }
  }

  getButtonPresses(): Set<string> {
    const presses = new Set<string>(this.buttonPresses);
    
    // Add DAS/ARR controlled movement
    this.checkMovementWithDAS('left', presses);
    this.checkMovementWithDAS('right', presses);
    this.checkMovementWithDAS('softDrop', presses);
    
    return presses;
  }

  private checkMovementWithDAS(button: string, presses: Set<string>): void {
    const timing = this.buttonTimings.get(button);
    if (!timing) return;

    if (timing.initialPress) {
      presses.add(button);
      timing.initialPress = false;
      timing.lastRepeat = timing.heldTime;
    } else if (timing.heldTime >= this.das * this.frameTime) {
      // DAS reached, check ARR
      const timeSinceLastRepeat = timing.heldTime - timing.lastRepeat;
      const arrTime = this.arr * this.frameTime;

      if (arrTime === 0 || timeSinceLastRepeat >= arrTime) {
        presses.add(button);
        timing.lastRepeat = timing.heldTime;
      }
    }
  }

  getButtonReleases(): Set<string> {
    return new Set<string>(this.buttonReleases);
  }

  isConnected(): boolean {
    const state = this.getState();
    return state !== null && state.connected;
  }
  
  private getButtonName(index: number): keyof GamepadState['buttons'] {
    const buttonMap: Record<number, keyof GamepadState['buttons']> = {
      0: 'cross',
      1: 'circle',
      2: 'square',
      3: 'triangle',
      4: 'l1',
      5: 'r1',
      6: 'l2',
      7: 'r2',
      8: 'share',
      9: 'options',
      10: 'l3',
      11: 'r3',
      12: 'up',
      13: 'down',
      14: 'left',
      15: 'right',
      16: 'ps',
      17: 'touchpad',
    };
    return buttonMap[index] || 'cross';
  }
}

export function createGamepadHandler(): GamepadHandler {
  return new GamepadHandlerImpl();
}