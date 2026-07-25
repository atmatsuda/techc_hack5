// js/chat.js
// 担当範囲：送信ボタンの活性制御・sendMessage・addChatBubble（詳細設計書 3.4 / 4章 参照）
import { AppState } from './app-state.js';
import { isValidMessage } from './validation.js';
import { playFlyAnimation } from './animation.js';

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const sendBtnStatus = document.getElementById('send-btn-status');
const chatArea = document.getElementById('chat-area');

/**
 * 送信ボタンの活性/非活性を、現在の入力値と送信中フラグから再計算する。
 * isValidMessage() を再利用することで多層防御の①（活性制御）を満たす。
 */
function updateSendButtonState() {
  const isSending = AppState.getState().chat.isSending;
  sendBtn.disabled = isSending || !isValidMessage(chatInput.value);
}

function setSendButtonStatus(text) {
  if (sendBtnStatus) {
    sendBtnStatus.textContent = text;
  }
}

function scrollToLatest() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function buildWrapperClass(sender) {
  const base = 'chat-bubble flex items-end gap-3 max-w-[85%]';
  return sender === 'me' ? `${base} ml-auto justify-end` : base;
}

function buildBubbleTextClass(sender) {
  return sender === 'me'
    ? 'bubble-text bg-sky-600 text-white p-3.5 rounded-2xl rounded-br-none text-sm shadow-md break-all whitespace-pre-wrap font-medium'
    : 'bubble-text bg-slate-800 border border-slate-700 text-slate-200 p-3.5 rounded-2xl rounded-bl-none text-sm shadow-md break-all whitespace-pre-wrap';
}

/**
 * チャットバブルをDOMに追加する。
 * XSS対策として innerHTML は使用せず、textContent のみでテキストを組み立てる。
 * @param {string} text 表示するメッセージ本文
 * @param {'me'|'peer'} sender 送信者種別
 * @param {{grammarNote?: string}} [options]
 * @returns {HTMLElement|null} 追加したバブルのラッパー要素（不正テキストの場合は null）
 */
export function addChatBubble(text, sender = 'me', options = {}) {
  if (!isValidMessage(text)) return null;

  const wrapper = document.createElement('div');
  wrapper.className = buildWrapperClass(sender);

  if (sender !== 'me') {
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 bg-sky-950 text-sky-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-sky-800';
    avatar.textContent = 'A';
    wrapper.appendChild(avatar);
  }

  const contentCol = document.createElement('div');
  contentCol.className = 'space-y-1 min-w-0';

  const bubbleText = document.createElement('div');
  bubbleText.className = buildBubbleTextClass(sender);
  bubbleText.textContent = text;
  contentCol.appendChild(bubbleText);

  if (options.grammarNote) {
    const note = document.createElement('p');
    note.className = 'grammar-note hidden text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2';
    note.textContent = options.grammarNote;
    contentCol.appendChild(note);
  }

  const meta = document.createElement('p');
  meta.className = 'text-[10px] text-slate-500 font-mono';
  meta.textContent = sender === 'me' ? '送信済み' : '受信';
  contentCol.appendChild(meta);

  wrapper.appendChild(contentCol);
  chatArea.appendChild(wrapper);
  scrollToLatest();

  return wrapper;
}

function showSendError(bubbleEl, text) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'send-error-mark ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer align-middle';
  marker.textContent = '！';
  marker.title = 'タップして再送信';
  marker.addEventListener('click', () => {
    marker.remove();
    attemptDelivery(bubbleEl, text);
  });
  bubbleEl.appendChild(marker);
}

/**
 * 疑似的なサーバー送信処理。実APIが無いため一定確率で失敗させ、
 * 失敗時は「！」マークを表示してクリックでの再送信を可能にする。
 */
function attemptDelivery(bubbleEl, text) {
  const failed = Math.random() < 0.15;
  if (failed) {
    showSendError(bubbleEl, text);
  }
}

/**
 * 送信処理を統括する。楽観的UI更新（即時バブル追加）→ 入力欄クリア →
 * 紙飛行機アニメーション → 0.5〜1秒のボタングレーアウトを行う。
 */
export function sendMessage() {
  if (AppState.getState().chat.isSending) return;

  const text = chatInput.value;
  if (!isValidMessage(text)) return; // ②sendMessage内ガード（多層防御）

  const bubble = addChatBubble(text.trim(), 'me');

  chatInput.value = '';
  updateSendButtonState();

  AppState.setChatSending(true);
  setSendButtonStatus('SENDING');
  updateSendButtonState();

  playFlyAnimation(chatInput);

  const busyDuration = 500 + Math.random() * 500; // 0.5〜1秒
  setTimeout(() => {
    AppState.setChatSending(false);
    setSendButtonStatus('READY');
    updateSendButtonState();
  }, busyDuration);

  attemptDelivery(bubble, text.trim());
}

chatInput.addEventListener('input', updateSendButtonState);

chatInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  e.preventDefault();
  if (AppState.getState().ui.isTransitioning) return; // オーバーレイ迂回対策の二段ガード
  sendMessage();
});

sendBtn.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  sendMessage();
});

updateSendButtonState();
