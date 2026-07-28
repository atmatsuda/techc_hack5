// js/archive.js
// 担当範囲：チャットログのlocalStorage保存・読込・一覧表示（要件定義書 2.3節 / 詳細設計書 4章 参照）
// 共同担当：川井田・菅野

const STORAGE_KEY = 'aiChatArchive';

function readArchiveList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArchiveList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * #chat-area内の現在のチャットバブルからメッセージ本文を収集する。
 * innerHTMLは使用せず、既存DOMのtextContentのみを読み取る（描画は一切行わない）。
 */
function collectCurrentMessages() {
  const chatArea = document.getElementById('chat-area');
  if (!chatArea) return [];

  return Array.from(chatArea.querySelectorAll('.chat-bubble'))
    .map((bubble) => {
      const bubbleText = bubble.querySelector('.bubble-text');
      if (!bubbleText) return null;
      const sender = bubble.classList.contains('justify-end') ? 'me' : 'peer';
      return { sender, text: bubbleText.textContent };
    })
    .filter(Boolean);
}

function setArchiveMessage(text) {
  const el = document.getElementById('archive-message');
  if (el) el.textContent = text; // innerHTMLではなくtextContent
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * #archive-list を保存済み一覧で再描画する。
 * innerHTMLは使用せず、DocumentFragment + textContentで構築する。
 * @param {Array<{id: string, savedAt: string, messages: Array<{sender: string, text: string}>}>} list
 */
function renderArchiveList(list) {
  const container = document.getElementById('archive-list');
  if (!container) return;

  container.textContent = ''; // innerHTMLではなくtextContentでクリア

  const fragment = document.createDocumentFragment();

  list.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2';

    const header = document.createElement('p');
    header.className = 'text-xs text-slate-500 font-mono';
    header.textContent = formatTimestamp(entry.savedAt);
    card.appendChild(header);

    const preview = document.createElement('p');
    preview.className = 'text-sm text-slate-200 break-all';
    preview.textContent = entry.messages[0]?.text ?? '';
    card.appendChild(preview);

    const count = document.createElement('p');
    count.className = 'text-[11px] text-slate-500';
    count.textContent = `${entry.messages.length}件のメッセージ`;
    card.appendChild(count);

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/**
 * 現在のチャット画面の会話ログをlocalStorageに保存する（新しい順で先頭に追加）。
 */
export function saveArchive() {
  const messages = collectCurrentMessages();
  if (messages.length === 0) {
    setArchiveMessage('保存する会話がありません。');
    return;
  }

  const list = readArchiveList();
  list.unshift({
    id: `archive_${list.length}_${messages.length}`,
    savedAt: new Date().toISOString(),
    messages,
  });
  writeArchiveList(list);

  setArchiveMessage(`会話を保存しました（${list.length}件保存済み）。`);
  renderArchiveList(list);
}

/**
 * localStorageから保存済みの会話ログ一覧を読み込み、#archive-list に描画する。
 */
export function loadArchive() {
  const list = readArchiveList();

  setArchiveMessage(
    list.length === 0
      ? '保存済みの会話はまだありません。'
      : `${list.length}件の保存済み会話を読み込みました。`
  );

  renderArchiveList(list);
}
