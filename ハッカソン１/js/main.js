// js/main.js
// 各モジュールのimport・初期化・イベントリスナー登録の起点。
// index.htmlから読み込む唯一のスクリプト（他モジュールはここでのimport経由でのみ連結する）。
import { AppState } from './app-state.js';
import './animation.js';
import './chat.js';
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

let isArchiveMode = false;

function showArchiveView() {
  isArchiveMode = true;
  chatArea.classList.add('hidden');
  chatFooter?.classList.add('hidden');
  archiveArea.classList.remove('hidden');
  if (archiveBtnText) archiveBtnText.textContent = 'チャット';
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

archiveSaveBtn?.addEventListener('click', saveArchive);
archiveLoadBtn?.addEventListener('click', loadArchive);

expressionToggleBtn?.addEventListener('click', () => {
  expressionPanel?.classList.toggle('hidden');
});

callBtn?.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  startCall();
});

hangupBtn?.addEventListener('click', () => {
  if (AppState.getState().ui.isTransitioning) return;
  endCall();
});
