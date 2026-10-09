// js/main.js
// 各モジュールのimport・初期化・イベントリスナー登録の起点。
// index.htmlから読み込む唯一のスクリプト（他モジュールはここでのimport経由でのみ連結する）。
import { AppState } from './app-state.js';
import './animation.js';
import { switchRoom, createNewRoom } from './chat.js';
import './translation.js';
import { startCall, endCall } from './call.js';
import { saveArchive, loadArchive } from './archive.js';
import './grammar.js';
import './phrase-visualizer.js';
import './expression-list.js';

const callBtn = document.getElementById('call-btn');
const hangupBtn = document.getElementById('hangup-btn');

const archiveToggleBtn = document.getElementById('archive-toggle-btn');
const archiveBtnText = document.getElementById('archive-btn-text');
const archiveSaveBtn = document.getElementById('archive-save-btn');
const archiveLoadBtn = document.getElementById('archive-load-btn');
const chatArea = document.getElementById('chat-area');
const archiveArea = document.getElementById('archive-area');
const chatFooter = document.getElementById('chat-footer');

const expressionToggleBtn = document.getElementById('expression-toggle-btn');
const expressionPanel = document.getElementById('expression-panel');
const createRoomBtn = document.getElementById('create-room-btn');

let isArchiveMode = false;

/**
 * ルーム一覧を画面（room-list-container）に描画・更新する
 */
function renderRoomListUI() {
  const container = document.getElementById('room-list-container');
  if (!container) return;

  const storedData = localStorage.getItem('chatRooms');
  if (!storedData) return;
  const roomsData = JSON.parse(storedData);

  container.innerHTML = '';

  Object.values(roomsData).forEach(room => {
    const item = document.createElement('div');
    item.className = 'p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer flex justify-between items-center transition-all group';
    
    item.innerHTML = `
      <div>
        <h3 class="font-bold text-sm text-slate-200 group-hover:text-sky-400 transition-colors">${room.partnerName}</h3>
        <p class="text-xs text-slate-500 font-mono mt-0.5">${room.messages.length}件のメッセージ</p>
      </div>
      <span class="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">選択 ➔</span>
    `;

    // ルームクリック時の処理：ルームを切り替えてチャット画面に戻る
    item.addEventListener('click', () => {
      switchRoom(room.roomId);
      showChatView();
    });

    container.appendChild(item);
  });
}

function showArchiveView() {
  isArchiveMode = true;
  chatArea.classList.add('hidden');
  chatFooter?.classList.add('hidden');
  archiveArea.classList.remove('hidden');
  if (archiveBtnText) archiveBtnText.textContent = 'チャット';
  
  // 一覧画面を開いたタイミングでルーム一覧を最新化する
  renderRoomListUI();
}

function showChatView() {
  isArchiveMode = false;
  archiveArea.classList.add('hidden');
  chatArea.classList.remove('hidden');
  chatFooter?.classList.remove('hidden');
  if (archiveBtnText) archiveBtnText.textContent = '一覧';
}

archiveToggleBtn?.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  if (isArchiveMode) {
    showChatView();
  } else {
    showArchiveView();
  }
});

// 新規ルーム作成ボタンのイベントリスナー
createRoomBtn?.addEventListener('click', () => {
  const partnerName = prompt('新しいチャット相手の名前を入力してください（例: Sarah 🇬🇧）', 'Sarah 🇬🇧');
  if (partnerName && partnerName.trim() !== '') {
    createNewRoom(partnerName.trim());
    renderRoomListUI();
    showChatView();
  }
});

archiveSaveBtn?.addEventListener('click', saveArchive);
archiveLoadBtn?.addEventListener('click', loadArchive);

expressionToggleBtn?.addEventListener('click', () => {
  expressionPanel?.classList.toggle('hidden');
});

// パネルの外側（余白部分）をクリック/タップしたら閉じる。
document.addEventListener('click', (e) => {
  if (!expressionPanel || expressionPanel.classList.contains('hidden')) return;
  if (expressionPanel.contains(e.target) || expressionToggleBtn?.contains(e.target)) return;
  expressionPanel.classList.add('hidden');
});

callBtn?.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  startCall();
});

hangupBtn?.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  endCall();
});

// --- ルーム切り替え時にヘッダーのパートナー名を更新するイベント受信用 ---
document.addEventListener('chat:roomSwitched', (e) => {
  const { partnerName } = e.detail;
  const headerNameEl = document.querySelector('#header-user-profile span.font-bold');
  if (headerNameEl) {
    headerNameEl.textContent = partnerName;
  }
});