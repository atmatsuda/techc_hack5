// js/animation.js
import { AppState } from './app-state.js';

/**
 * 連打防止・入力不可用の物理ロックを設定
 */
export function lockUI() {
  AppState.setGlobalLock(true);

  const lockOverlay = document.getElementById('input-lock-overlay');
  if (lockOverlay) {
    lockOverlay.classList.remove('hidden');
  }

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.blur();
  }
}

/**
 * 物理ロックの解除
 */
export function unlockUI() {
  AppState.setGlobalLock(false);

  const lockOverlay = document.getElementById('input-lock-overlay');
  if (lockOverlay) {
    lockOverlay.classList.add('hidden');
  }
}

/**
 * 通話画面へスライド遷移
 */
export function transitionToCallScreen() {
  lockUI();

  const chatScreen = document.getElementById('chat-screen');
  const callScreen = document.getElementById('call-screen');

  if (!chatScreen || !callScreen) {
    unlockUI();
    return;
  }

  const handleTransitionEnd = (e) => {
    // transformのアニメーション完了時のみ検知
    if (e.propertyName !== 'transform') return;

    callScreen.removeEventListener('transitionend', handleTransitionEnd);
    unlockUI();
    document.dispatchEvent(new CustomEvent('call:transitionEnded'));
  };

  callScreen.addEventListener('transitionend', handleTransitionEnd);

  chatScreen.classList.add('slide-out');
  callScreen.classList.add('slide-in');
}

/**
 * チャット画面へスライド復帰
 */
export function transitionToChatScreen() {
  lockUI();

  const chatScreen = document.getElementById('chat-screen');
  const callScreen = document.getElementById('call-screen');

  if (!chatScreen || !callScreen) {
    unlockUI();
    return;
  }

  const handleTransitionEnd = (e) => {
    if (e.propertyName !== 'transform') return;

    chatScreen.removeEventListener('transitionend', handleTransitionEnd);
    unlockUI();
    document.dispatchEvent(new CustomEvent('call:transitionEnded'));
  };

  chatScreen.addEventListener('transitionend', handleTransitionEnd);

  chatScreen.classList.remove('slide-out');
  callScreen.classList.remove('slide-in');
}

/**
 * メッセージ送信時の紙飛行機飛翔アニメーション
 * @param {HTMLElement} sourceElement アニメーションの起点となる要素（#chat-input等）
 */
export function playFlyAnimation(sourceElement) {
  if (!sourceElement) return;

  const rect = sourceElement.getBoundingClientRect();

  // 飛翔する紙飛行機アイコン要素の動的生成
  const plane = document.createElement('div');
  plane.className = 'fly-paper-plane';
  plane.textContent = '✈️';

  // 起点位置のセット
  plane.style.left = `${rect.right - 40}px`;
  plane.style.top = `${rect.top + 10}px`;

  document.body.appendChild(plane);

  // 次フレームでCSSアニメーションを発火
  requestAnimationFrame(() => {
    plane.classList.add('fly-active');
  });

  // アニメーション終了後にDOMから削除（500ms想定）
  setTimeout(() => {
    if (plane.parentNode) {
      plane.parentNode.removeChild(plane);
    }
  }, 500);
}
