import type { InputState, InputTimings } from './types';
import { INPUT_TIMINGS } from './types';
import type { KeyMapping } from '../lib/keyconfig/types';

export interface InputHandler {
  update(deltaTime: number): void;
  getState(): InputState;
  keyDown(key: string): void;
  keyUp(key: string): void;
  reset(): void;
  updateKeyMapping(mapping: KeyMapping): void;
}

interface KeyTimings {
  heldTime: number;
  lastRepeat: number;
  initialPress: boolean;
}

export class StandardInputHandler implements InputHandler {
  private state: InputState = {
    left: false,
    right: false,
    down: false,
    hardDrop: false,
    rotateClockwise: false,
    rotateCounterclockwise: false,
    hold: false,
  };
  
  private keyTimings: Map<string, KeyTimings> = new Map();
  private timings: InputTimings;
  private frameTime = 1000 / 60; // 60fps in milliseconds
  private keyMapping: KeyMapping | null = null;
  
  constructor(timings: InputTimings = INPUT_TIMINGS, keyMapping?: KeyMapping) {
    this.timings = timings;
    this.keyMapping = keyMapping || null;
  }
  
  updateKeyMapping(mapping: KeyMapping): void {
    this.keyMapping = mapping;
  }
  
  update(deltaTime: number): void {
    // Reset single-frame inputs
    this.state.hardDrop = false;
    this.state.rotateClockwise = false;
    this.state.rotateCounterclockwise = false;
    this.state.hold = false;
    
    // Handle DAS/ARR for movement keys
    this.updateMovementKey('left', deltaTime);
    this.updateMovementKey('right', deltaTime);
    
    // Handle soft drop
    this.updateSoftDrop(deltaTime);
  }
  
  private updateMovementKey(direction: 'left' | 'right', deltaTime: number): void {
    const timing = this.keyTimings.get(direction);
    if (!timing) {
      this.state[direction] = false;
      return;
    }
    
    timing.heldTime += deltaTime;
    
    if (timing.initialPress) {
      this.state[direction] = true;
      timing.initialPress = false;
      timing.lastRepeat = timing.heldTime;
    } else if (timing.heldTime >= this.timings.das * this.frameTime) {
      // DAS has been reached, check ARR
      const timeSinceLastRepeat = timing.heldTime - timing.lastRepeat;
      const arrTime = this.timings.arr * this.frameTime;
      
      if (arrTime === 0 || timeSinceLastRepeat >= arrTime) {
        this.state[direction] = true;
        timing.lastRepeat = timing.heldTime;
      } else {
        this.state[direction] = false;
      }
    } else {
      this.state[direction] = false;
    }
  }
  
  private updateSoftDrop(deltaTime: number): void {
    const timing = this.keyTimings.get('down');
    if (!timing) {
      this.state.down = false;
      return;
    }
    
    timing.heldTime += deltaTime;
    
    // Soft drop speed: cells per second
    const dropInterval = 1000 / this.timings.softDropSpeed;
    
    if (timing.initialPress) {
      this.state.down = true;
      timing.initialPress = false;
      timing.lastRepeat = timing.heldTime;
    } else {
      const timeSinceLastRepeat = timing.heldTime - timing.lastRepeat;
      if (timeSinceLastRepeat >= dropInterval) {
        this.state.down = true;
        timing.lastRepeat = timing.heldTime;
      } else {
        this.state.down = false;
      }
    }
  }
  
  keyDown(key: string): void {
    const normalizedKey = this.normalizeKey(key);
    
    // Ignore if already pressed
    if (this.keyTimings.has(normalizedKey)) {
      return;
    }
    
    // Set up timing for held keys
    if (['left', 'right', 'down'].includes(normalizedKey)) {
      this.keyTimings.set(normalizedKey, {
        heldTime: 0,
        lastRepeat: 0,
        initialPress: true
      });
    }
    
    // Handle instant actions
    switch (normalizedKey) {
      case 'hardDrop':
        this.state.hardDrop = true;
        break;
      case 'rotateClockwise':
        this.state.rotateClockwise = true;
        break;
      case 'rotateCounterclockwise':
        this.state.rotateCounterclockwise = true;
        break;
      case 'hold':
        this.state.hold = true;
        break;
    }
  }
  
  keyUp(key: string): void {
    const normalizedKey = this.normalizeKey(key);
    this.keyTimings.delete(normalizedKey);
  }
  
  getState(): InputState {
    return { ...this.state };
  }
  
  reset(): void {
    this.state = {
      left: false,
      right: false,
      down: false,
      hardDrop: false,
      rotateClockwise: false,
      rotateCounterclockwise: false,
      hold: false,
    };
    this.keyTimings.clear();
  }
  
  private normalizeKey(key: string): string {
    // Use custom key mapping if available
    if (this.keyMapping) {
      for (const [action, keys] of Object.entries(this.keyMapping)) {
        if (keys.includes(key)) {
          return action;
        }
      }
      return key;
    }
    
    // Fallback to default mapping
    const keyMap: Record<string, string> = {
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'ArrowDown': 'down',
      'ArrowUp': 'rotateClockwise',
      ' ': 'hardDrop',
      'Space': 'hardDrop',
      'z': 'rotateCounterclockwise',
      'Z': 'rotateCounterclockwise',
      'x': 'rotateClockwise',
      'X': 'rotateClockwise',
      'c': 'hold',
      'C': 'hold',
      'Shift': 'hold',
    };
    
    return keyMap[key] || key;
  }
}

export function createInputHandler(timings?: InputTimings): InputHandler {
  return new StandardInputHandler(timings);
}