// js/app-state.js
const state = {
  chat: { isSending: false, isLocked: false, autoTranslate: true }, // ★ autoTranslateを追加
  call: { isAnimating: false, isLocked: false, elapsedSeconds: 0 },
  translation: { isRendering: false },
  ui: { isTransitioning: false },
};

function setChatSending(value) {
  state.chat.isSending = value;
}

function setChatLocked(value) {
  state.chat.isLocked = value;
}

// ★ 翻訳設定を変更するメソッドを追加
function setAutoTranslate(value) {
  state.chat.autoTranslate = value;
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
  state.translation.isRendering = value;
}

function getState() {
  return structuredClone(state);
}

// js/app-state.js の一番下
export const AppState = {
  setChatSending,
  setChatLocked,
  setAutoTranslate, // ← ここに必ずこれがあるか確認！
  setGlobalLock,
  setCallAnimating,
  setCallLocked,
  setCallElapsed,
  setTranslationRendering,
  getState,
};