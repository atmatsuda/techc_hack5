// js/chat.js
// 担当範囲：送信ボタンの活性制御・sendMessage・addChatBubble・localStorage永続化・ルーム切り替え・新規ルーム作成・翻訳設定連動
import { AppState } from './app-state.js';
import { isValidMessage } from './validation.js';
import { playFlyAnimation } from './animation.js';

// --- 現在アクティブなルームID ---
let currentRoomId = 'room_alex';

// --- 初期データの定義（localStorageが空の場合のデフォルト） ---
const initialRoomsData = {
  "room_alex": {
    "roomId": "room_alex",
    "partnerName": "Alex 🇺🇸",
    "messages": []
  }
};

// DOM要素の取得
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const sendBtnStatus = document.getElementById('send-btn-status');
const chatArea = document.getElementById('chat-area');
const translateToggle = document.getElementById('translate-toggle'); // ★ 翻訳トグル
const scrollDownBtn = document.getElementById('scroll-down-btn'); // ★ 新着メッセージ通知ボタン

if (!chatInput || !sendBtn || !chatArea) {
  console.error('[ChatJS] 必要なDOM要素が見つかりません。HTMLのIDを確認してください。');
}

// --- スマートスクロール制御 ---
function isUserAtBottom() {
  if (!chatArea) return true;
  const threshold = 100; // 許容するピクセル数
  return chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight <= threshold;
}

function smartScrollToLatest() {
  if (!chatArea) return;

  if (isUserAtBottom()) {
    chatArea.scrollTop = chatArea.scrollHeight;
    if (scrollDownBtn) scrollDownBtn.classList.add('hidden');
  } else {
    if (scrollDownBtn) scrollDownBtn.classList.remove('hidden');
  }
}

if (chatArea && scrollDownBtn) {
  chatArea.addEventListener('scroll', () => {
    if (isUserAtBottom()) {
      scrollDownBtn.classList.add('hidden');
    }
  });

  scrollDownBtn.addEventListener('click', () => {
    chatArea.scrollTop = chatArea.scrollHeight;
    scrollDownBtn.classList.add('hidden');
  });
}
// -----------------------------

// --- 相手の入力中（Typing...）アニメーション制御 ---
export function showTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (!indicator) return;

  // 現在のルームのパートナー名を動的に反映
  const storedData = localStorage.getItem('chatRooms');
  if (storedData) {
    const roomsData = JSON.parse(storedData);
    const currentRoom = roomsData[currentRoomId];
    if (currentRoom && currentRoom.partnerName) {
      const nameSpan = indicator.querySelector('span:last-child');
      if (nameSpan) {
        nameSpan.textContent = `${currentRoom.partnerName} が入力中...`;
      }
    }
  }

  indicator.classList.remove('hidden');
  indicator.classList.add('flex');
  smartScrollToLatest();
}

export function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (!indicator) return;

  indicator.classList.remove('flex');
  indicator.classList.add('hidden');
}
// --------------------------------------------------

/**
 * 現在のルームのメッセージを localStorage に安全に保存する
 */
function saveMessageToLocalStorage(messageObj) {
  try {
    const storedData = localStorage.getItem('chatRooms');
    let roomsData = storedData ? JSON.parse(storedData) : initialRoomsData;

    if (!roomsData[currentRoomId]) {
      roomsData[currentRoomId] = {
        roomId: currentRoomId,
        partnerName: "Chat Partner",
        messages: []
      };
    }

    roomsData[currentRoomId].messages.push(messageObj);
    localStorage.setItem('chatRooms', JSON.stringify(roomsData));
  } catch (e) {
    console.warn('[Storage] メッセージの保存に失敗しました。');
  }
}

/**
 * アプリ起動時やルーム切り替え時に、ストレージから過去メッセージを読み込んで画面に復元する
 */
export function initChatStorageAndLoad() {
  try {
    if (!localStorage.getItem('chatRooms')) {
      localStorage.setItem('chatRooms', JSON.stringify(initialRoomsData));
    }

    const storedData = localStorage.getItem('chatRooms');
    if (!storedData) return;

    const roomsData = JSON.parse(storedData);
    const currentRoom = roomsData[currentRoomId];

    if (chatArea) {
      chatArea.innerHTML = '';
    }

    if (currentRoom && Array.isArray(currentRoom.messages)) {
      currentRoom.messages.forEach(msg => {
        addChatBubble(msg.text, msg.sender === 'me' ? 'me' : 'peer', {
          grammarNote: msg.grammarNote || null,
          time: msg.time || ''
        });
      });
    }
  } catch (e) {
    console.warn('[Storage] 履歴の復元に失敗しました。');
  }
}

/**
 * 別ルームへ切り替える
 */
export function switchRoom(roomId) {
  try {
    hideTypingIndicator(); // ルーム切り替え時はタイピング表示をクリア
    if (scrollDownBtn) scrollDownBtn.classList.add('hidden');

    const storedData = localStorage.getItem('chatRooms');
    const roomsData = storedData ? JSON.parse(storedData) : initialRoomsData;

    if (!roomsData[roomId]) {
      console.warn('[ChatJS] 指定されたルームが存在しません:', roomId);
      return;
    }

    currentRoomId = roomId;
    initChatStorageAndLoad();
    
    document.dispatchEvent(new CustomEvent('chat:roomSwitched', {
      detail: { roomId, partnerName: roomsData[roomId].partnerName }
    }));
  } catch (e) {
    console.warn('[ChatJS] ルームの切り替えに失敗しました。');
  }
}

/**
 * 新規ルームを作成してアクティブにする
 */
export function createNewRoom(partnerName = 'New Partner 🌍') {
  try {
    const newRoomId = 'room_' + Date.now();
    const storedData = localStorage.getItem('chatRooms');
    let roomsData = storedData ? JSON.parse(storedData) : initialRoomsData;

    roomsData[newRoomId] = {
      roomId: newRoomId,
      partnerName: partnerName,
      messages: []
    };

    localStorage.setItem('chatRooms', JSON.stringify(roomsData));
    switchRoom(newRoomId);
    
    return newRoomId;
  } catch (e) {
    console.warn('[ChatJS] 新規ルームの作成に失敗しました。');
    return null;
  }
}

/**
 * AI（相手）からのメッセージを受け取って画面に吹き出しを追加する
 */
export function receivePeerMessage(text, options = {}) {
  // 相手（peer）のチャットバブルを画面に追加する
  return addChatBubble(text, 'peer', {
    grammarNote: options.grammarNote || null,
    nuance: options.nuance || null,
    time: options.time || ''
  });
}

/**
 * 送信ボタンの活性/非活性を再計算する。
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
  const timeText = options.time ? ` • ${options.time}` : '';
  meta.textContent = sender === 'me' ? `送信済み${timeText}` : `受信${timeText}`;
  contentCol.appendChild(meta);

  wrapper.appendChild(contentCol);
  chatArea.appendChild(wrapper);
  
  // ★ スマートスクロールを適用
  smartScrollToLatest();

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
    const currentAutoTranslate = AppState.getState().chat.autoTranslate;

    // ★ AIからの返信待ちの間に入力中アニメーションを表示
    showTypingIndicator();

    const response = await fetch('http://127.0.0.1:5000/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'user_001',
        roomId: currentRoomId, 
        text: text,
        sourceLang: 'en',
        targetLang: 'ja',
        autoTranslate: currentAutoTranslate
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
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
      showSendError(bubbleEl, text);
    }
  } catch (error) {
    showSendError(bubbleEl, text);
  } finally {
    // ★ 成功・失敗にかかわらずタイピング表示を確実に消去
    hideTypingIndicator();
  }
}

/**
 * 送信処理を統括する。
 */
export async function sendMessage() {
  if (!chatInput) return;
  if (AppState.getState().chat.isSending) return;

  const text = chatInput.value.trim();
  if (!isValidMessage(text)) return;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMessage = {
    id: 'msg_' + Date.now(),
    sender: 'me',
    text: text,
    time: timeString,
    status: 'delivered',
    reactions: []
  };

  const bubble = addChatBubble(text, 'me', { time: timeString });
  saveMessageToLocalStorage(newMessage);

  chatInput.value = '';
  updateSendButtonState();

  AppState.setChatSending(true);
  setSendButtonStatus('SENDING');
  updateSendButtonState();

  if (typeof playFlyAnimation === 'function') {
    playFlyAnimation(chatInput);
  }

  await attemptDelivery(bubble, text);

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

// ★ 翻訳トグルスイッチの変更監視
if (translateToggle) {
  translateToggle.checked = AppState.getState().chat.autoTranslate;
  translateToggle.addEventListener('change', (e) => {
    AppState.setAutoTranslate(e.target.checked);
  });
}

// --- AI（相手）からの返信を受け取ったときに、localStorageへ自動保存する ---
document.addEventListener('chat:apiReplyReceived', (e) => {
  try {
    // 安全のため、受信時にもタイピングインジケーターを確実に消去
    hideTypingIndicator();

    const detail = e.detail;
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const peerMessage = {
      id: 'msg_' + Date.now(),
      sender: 'peer',
      text: detail.translatedText || detail.translationJa || '',
      time: timeString,
      status: 'received',
      grammarNote: detail.grammarNote || null,
      nuance: detail.nuance || null,
      reactions: []
    };

    saveMessageToLocalStorage(peerMessage);
    
  } catch (err) {
    console.warn('[Storage] 受信メッセージの保存に失敗しました。');
  }
});

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (AppState.getState().ui.isTransitioning) return;
    sendMessage();
  });
}

// --- 初期化処理（ページ読み込み時に履歴を復元） ---
window.addEventListener('DOMContentLoaded', () => {
  initChatStorageAndLoad();
  updateSendButtonState();
});