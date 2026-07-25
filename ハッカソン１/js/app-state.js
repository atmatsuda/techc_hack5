// js/app-state.js
// 担当範囲：グローバル状態ストア（詳細設計書 2章 参照）
// 設計原則：state本体はモジュール内に完全に隠蔽し、外部からはsetXxx系メソッドとgetState()（スナップショット）経由でのみアクセス可能とする。

const state = {
  chat: { isSending: false, isLocked: false },
  call: { isAnimating: false, isLocked: false, elapsedSeconds: 0 },
  translation: { isRendering: false },
  ui: { isTransitioning: false }, // 画面遷移中の全体ロック用フラグ（input-lock-overlayと連動する唯一の真実源）
};

function setChatSending(value) {
  state.chat.isSending = value;
}

function setChatLocked(value) {
  state.chat.isLocked = value;
}

function setGlobalLock(value) {
  state.ui.isTransitioning = value;
}

function setCallAnimating(value) {
  state.call.isAnimating = value;
}

function setCallLocked(value) {
  state.call.isLocked = value;
}

function setCallElapsed(seconds) {
  state.call.elapsedSeconds = seconds;
}

function setTranslationRendering(value) {
  // メッセージ単位の翻訳状態はtranslation.js側のWeakMap/Setで個別管理する。
  // ここでは「翻訳処理が1件以上進行中か」の集約フラグのみを扱う。
  state.translation.isRendering = value;
}

function getState() {
  return structuredClone(state); // 読み取りは常にスナップショット（防御的コピー）
}

export const AppState = {
  setChatSending,
  setChatLocked,
  setGlobalLock,
  setCallAnimating,
  setCallLocked,
  setCallElapsed,
  setTranslationRendering,
  getState,
};
