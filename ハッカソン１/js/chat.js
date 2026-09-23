// js/chat.js
// 担当範囲：送信ボタンの活性制御・sendMessage・addChatBubble（詳細設計書 3.4 / 4章 参照）
import { AppState } from './app-state.js';
import { isValidMessage } from './validation.js';
import { playFlyAnimation } from './animation.js';

// DOM要素の取得
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const sendBtnStatus = document.getElementById('send-btn-status');
const chatArea = document.getElementById('chat-area');

// 要素の存在チェック（デバッグ用）
if (!chatInput || !sendBtn || !chatArea) {
  console.error('[ChatJS] 必要なDOM要素が見つかりません。HTMLのIDを確認してください。');
}

/**
 * 送信ボタンの活性/非活性を、現在の入力値と送信中フラグから再計算する。
 */
function updateSendButtonState() {
  if (!chatInput || !sendBtn) return;
  
  const isSending = AppState.getState().chat.isSending;
  const val = chatInput.value;
  const isValid = isValidMessage(val);
  
  sendBtn.disabled = isSending || !isValid;
}

function setSendButtonStatus(text) {
  if (sendBtnStatus) {
    sendBtnStatus.textContent = text;
  }
}

function scrollToLatest() {
  if (chatArea) {
    chatArea.scrollTop = chatArea.scrollHeight;
  }
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
 * バックエンド（Flask, POST /api/chat/send）への実送信処理。
 */
async function attemptDelivery(bubbleEl, text) {
  try {
    const response = await fetch('http://localhost:5000/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'user_001',
        text: text,
        sourceLang: 'en',
        targetLang: 'ja',
        autoTranslate: true
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      // 🔍 バックエンドから返ってきたデータをコンソールで確認する
      console.log("【APIレスポンス確認】", data.reply);

      document.dispatchEvent(new CustomEvent('chat:apiReplyReceived', {
        detail: {
          translatedText: data.reply.en,
          translationJa: data.reply.ja,
          grammarNote: data.reply.grammarNote,
          nuance: data.reply.nuance,
          phraseMap: data.reply.phraseMap
        }
      }));
    } else {
      console.error('API Error:', data.message);
      showSendError(bubbleEl, text);
    }
  } catch (error) {
    console.error('Network Error:', error);
    showSendError(bubbleEl, text);
  }
}

/**
 * 送信処理を統括する。
 */
export async function sendMessage() {
  if (!chatInput) return;
  if (AppState.getState().chat.isSending) return;

  const text = chatInput.value;
  if (!isValidMessage(text)) return;

  const bubble = addChatBubble(text.trim(), 'me');

  chatInput.value = '';
  updateSendButtonState();

  AppState.setChatSending(true);
  setSendButtonStatus('SENDING');
  updateSendButtonState();

  if (typeof playFlyAnimation === 'function') {
    playFlyAnimation(chatInput);
  }

  // Flaskサーバーへの通信
  await attemptDelivery(bubble, text.trim());

  AppState.setChatSending(false);
  setSendButtonStatus('READY');
  updateSendButtonState();
}

// イベントリスナーの登録
if (chatInput) {
  chatInput.addEventListener('input', updateSendButtonState);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    if (AppState.getState().ui.isTransitioning) return;
    sendMessage();
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (AppState.getState().ui.isTransitioning) return;
    sendMessage();
  });
}

// 初期化時のボタン状態更新
updateSendButtonState();