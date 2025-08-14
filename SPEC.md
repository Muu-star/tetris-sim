# Tetris Simulator (Browser, no gravity)
## Controls/Physics
- Gravity: 0
- Rotation: SRS full
- RNG: 7-bag
- DAS: 10F, ARR: 2F (60fps基準)
- Soft drop: 20 cells/s
- Hard drop: instant lock
- Soft drop: ground contact -> second soft drop to lock

## Modes
- Simulation: Problem(盤面+NEXT+HOLD)作成→Solution(操作列)保存
- REN: 複数初期盤面からランダム
- T-Spin: 複数初期盤面、TSdの正解=回転入れ成功 AND 下穴未充填
- Drill: 初期はHard分類。出題は Hard80/Normal15/Easy5。完了時に再分類UI
- Optimization: 最小操作数が正解。違反でSE。Undoは1手のみ

## Save Format (LLM解析前提)
- JSONコンテナ＋Fumen埋め込み（boardはFumen、メタはJSON）
- Local-first: IndexedDB (idb)
- 抽象API: laterでクラウド同期差し替え可能

## Metrics/Logs
- APM, misdrop, opCount, latency
- Events: drill_start/complete, classify(difficulty), misdrop, undo
- Replay: 任意区間切り出し＋タイトルで保存

## Acceptance
- 入力→描画 <50ms@ローカル
- SRSキック表の境界ケーステストGREEN
- 7bagの分布偏りが許容内
- Drill重み 80/15/5 が統計的に近似
- 保存/復元/リプレイ再生OK
