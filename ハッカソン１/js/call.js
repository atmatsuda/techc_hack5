// js/call.js
// 担当範囲：通話モック開始/終了・経過タイマー（詳細設計書 2.3節 / 3.3節 / 4章 参照）
import { AppState } from './app-state.js';
import { transitionToCallScreen, transitionToChatScreen } from './animation.js';

let callIntervalId = null; // 通話経過タイマーのID（単一値のため通常変数管理）
let callAbortController = null; // 通話開始時に生成し、終了時に紐づく全タイマーを一括中断

function formatElapsed(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function renderCallTimerDisplay(seconds) {
  const callTimer = document.getElementById('call-timer');
  if (callTimer) {
    callTimer.textContent = formatElapsed(seconds);
  }
}

/**
 * 通話経過タイマーを開始する（1秒ごとにカウントアップし、00:00形式で表示）。
 */
export function startCallTimer() {
  let elapsed = 0;
  renderCallTimerDisplay(elapsed);
  AppState.setCallElapsed(elapsed);

  callIntervalId = setInterval(() => {
    elapsed += 1;
    AppState.setCallElapsed(elapsed);
    renderCallTimerDisplay(elapsed);
  }, 1000);
}

/**
 * 通話経過タイマーを確実に停止する。
 */
export function stopCallTimer() {
  clearInterval(callIntervalId);
  callIntervalId = null;
}

/**
 * 通話開始。AbortControllerを生成して以降の翻訳待ち等を一括中断できるようにした上で、
 * チャット→通話画面のスライド遷移（animation.js）を行う。
 */
export function startCall() {
  if (AppState.getState().call.isAnimating) return; // 二重起動防止

  callAbortController = new AbortController();
  AppState.setCallAnimating(true);
  document.dispatchEvent(
    new CustomEvent('call:started', { detail: { signal: callAbortController.signal } })
  );

  transitionToCallScreen();
}

/**
 * 通話終了。進行中の翻訳タイマー等をAbortControllerで一括中断し、
 * 通話→チャット画面のスライド遷移（animation.js）を行う。
 */
export function endCall() {
  callAbortController?.abort(); // 紐づく全タイマーのabortイベントが発火 → clearTimeout実行
  callAbortController = null;

  document.dispatchEvent(new CustomEvent('call:ended'));

  transitionToChatScreen();
}

document.addEventListener('call:ended', () => {
  stopCallTimer();
});

// animation.jsは往路（通話画面へ）・復路（チャット画面へ）の両方で同じ
// 'call:transitionEnded' を発火するため、実際に表示された画面をDOMから判定し、
// 通話画面への遷移が完了した場合のみ経過タイマーを開始する。
document.addEventListener('call:transitionEnded', () => {
  const callScreen = document.getElementById('call-screen');
  const enteringCallScreen = callScreen?.classList.contains('slide-in');

  AppState.setCallAnimating(false);

  if (enteringCallScreen) {
    startCallTimer();
  }
});
