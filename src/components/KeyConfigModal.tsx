import React, { useState, useEffect } from 'react';
import { useKeyConfig } from '../contexts/KeyConfigContext';
import './KeyConfigModal.css';

interface KeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  left: '左移動',
  right: '右移動',
  softDrop: 'ソフトドロップ',
  hardDrop: 'ハードドロップ',
  rotateClockwise: '右回転',
  rotateCounterclockwise: '左回転',
  hold: 'ホールド',
  undo: '一手戻る',
  reset: 'リセット',
};

const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: '✕ボタン',
  1: '○ボタン',
  2: '□ボタン',
  3: '△ボタン',
  4: 'L1',
  5: 'R1',
  6: 'L2',
  7: 'R2',
  8: 'SHARE',
  9: 'OPTIONS',
  10: 'L3',
  11: 'R3',
  12: '十字キー上',
  13: '十字キー下',
  14: '十字キー左',
  15: '十字キー右',
  16: 'PSボタン',
  17: 'タッチパッド',
};

export const KeyConfigModal: React.FC<KeyConfigModalProps> = ({ isOpen, onClose }) => {
  const { config, updateKeyboardMapping, updateGamepadMapping, updateDAS, updateARR, updateSoftDropSpeed, resetToDefaults } = useKeyConfig();
  const [activeTab, setActiveTab] = useState<'keyboard' | 'gamepad' | 'timing'>('keyboard');
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [listeningForKey, setListeningForKey] = useState(false);
  const [listeningForButton, setListeningForButton] = useState(false);
  const [detectedGamepad, setDetectedGamepad] = useState(false);

  // Check for gamepad connection
  useEffect(() => {
    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      const hasGamepad = Array.from(gamepads).some(gp => gp !== null);
      setDetectedGamepad(hasGamepad);
    };

    checkGamepad();
    const interval = setInterval(checkGamepad, 1000);

    window.addEventListener('gamepadconnected', checkGamepad);
    window.addEventListener('gamepaddisconnected', checkGamepad);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', checkGamepad);
      window.removeEventListener('gamepaddisconnected', checkGamepad);
    };
  }, []);

  // Handle keyboard key capture
  useEffect(() => {
    if (!listeningForKey || !editingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key === ' ' ? 'Space' : e.key;
      
      // Update the key mapping
      const currentKeys = config.keyboard[editingAction as keyof typeof config.keyboard] || [];
      if (!currentKeys.includes(key)) {
        updateKeyboardMapping(editingAction as any, [...currentKeys, key]);
      }
      
      setListeningForKey(false);
      setEditingAction(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningForKey, editingAction, config.keyboard, updateKeyboardMapping]);

  // Handle gamepad button capture
  useEffect(() => {
    if (!listeningForButton || !editingAction) return;

    const checkButtons = () => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (!gamepad) continue;
        
        for (let i = 0; i < gamepad.buttons.length; i++) {
          if (gamepad.buttons[i].pressed) {
            const currentButtons = config.gamepad[editingAction as keyof typeof config.gamepad] as number[] || [];
            if (!currentButtons.includes(i)) {
              updateGamepadMapping(editingAction as any, [...currentButtons, i]);
            }
            setListeningForButton(false);
            setEditingAction(null);
            return;
          }
        }
      }
    };

    const interval = setInterval(checkButtons, 50);
    return () => clearInterval(interval);
  }, [listeningForButton, editingAction, config.gamepad, updateGamepadMapping]);

  const handleAddKey = (action: string) => {
    setEditingAction(action);
    setListeningForKey(true);
  };

  const handleAddButton = (action: string) => {
    setEditingAction(action);
    setListeningForButton(true);
  };

  const handleRemoveKey = (action: string, key: string) => {
    const currentKeys = config.keyboard[action as keyof typeof config.keyboard] || [];
    updateKeyboardMapping(action as any, currentKeys.filter(k => k !== key));
  };

  const handleRemoveButton = (action: string, button: number) => {
    const currentButtons = config.gamepad[action as keyof typeof config.gamepad] as number[] || [];
    updateGamepadMapping(action as any, currentButtons.filter(b => b !== button));
  };

  if (!isOpen) return null;

  return (
    <div className="key-config-modal-overlay" onClick={onClose}>
      <div className="key-config-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>キーコンフィグ</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'keyboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('keyboard')}
          >
            キーボード
          </button>
          <button 
            className={`tab ${activeTab === 'gamepad' ? 'active' : ''}`}
            onClick={() => setActiveTab('gamepad')}
          >
            ゲームパッド
          </button>
          <button 
            className={`tab ${activeTab === 'timing' ? 'active' : ''}`}
            onClick={() => setActiveTab('timing')}
          >
            タイミング
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'keyboard' && (
            <div className="config-section">
              {Object.entries(ACTION_LABELS).map(([action, label]) => (
                <div key={action} className="config-row">
                  <div className="action-label">{label}</div>
                  <div className="key-list">
                    {(config.keyboard[action as keyof typeof config.keyboard] || []).map(key => (
                      <div key={key} className="key-chip">
                        <span>{key}</span>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveKey(action, key)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {listeningForKey && editingAction === action ? (
                      <div className="key-chip listening">
                        キーを押してください...
                      </div>
                    ) : (
                      <button 
                        className="add-key-btn"
                        onClick={() => handleAddKey(action)}
                      >
                        + 追加
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'gamepad' && (
            <div className="config-section">
              {!detectedGamepad && (
                <div className="gamepad-warning">
                  ゲームパッドが接続されていません
                </div>
              )}
              {Object.entries(ACTION_LABELS).map(([action, label]) => (
                <div key={action} className="config-row">
                  <div className="action-label">{label}</div>
                  <div className="key-list">
                    {((config.gamepad[action as keyof typeof config.gamepad] as number[]) || []).map(button => (
                      <div key={button} className="key-chip">
                        <span>{GAMEPAD_BUTTON_NAMES[button] || `ボタン${button}`}</span>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveButton(action, button)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {listeningForButton && editingAction === action ? (
                      <div className="key-chip listening">
                        ボタンを押してください...
                      </div>
                    ) : (
                      <button 
                        className="add-key-btn"
                        onClick={() => handleAddButton(action)}
                        disabled={!detectedGamepad}
                      >
                        + 追加
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="config-section timing-section">
              <div className="timing-row">
                <label>DAS (Delayed Auto Shift)</label>
                <div className="timing-control">
                  <input 
                    type="range"
                    min="0"
                    max="30"
                    value={config.das}
                    onChange={e => updateDAS(Number(e.target.value))}
                  />
                  <span className="timing-value">{config.das} frames</span>
                </div>
                <div className="timing-hint">初回移動までの遅延</div>
              </div>

              <div className="timing-row">
                <label>ARR (Auto Repeat Rate)</label>
                <div className="timing-control">
                  <input 
                    type="range"
                    min="0"
                    max="10"
                    value={config.arr}
                    onChange={e => updateARR(Number(e.target.value))}
                  />
                  <span className="timing-value">{config.arr} frames</span>
                </div>
                <div className="timing-hint">連続移動の間隔</div>
              </div>

              <div className="timing-row">
                <label>ソフトドロップ速度</label>
                <div className="timing-control">
                  <input 
                    type="range"
                    min="1"
                    max="60"
                    value={config.softDropSpeed}
                    onChange={e => updateSoftDropSpeed(Number(e.target.value))}
                  />
                  <span className="timing-value">{config.softDropSpeed} cells/sec</span>
                </div>
                <div className="timing-hint">ソフトドロップの落下速度</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="reset-btn" onClick={resetToDefaults}>
            デフォルトに戻す
          </button>
          <button className="save-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};