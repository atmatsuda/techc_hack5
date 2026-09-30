// js/translation.js
import { renderHighlightedText } from './phrase-visualizer.js';

/**
 * AIからの返信データを受け取り、チャットエリアに「受信メッセージ（相手のバブル）」として
 * 翻訳・文法解説・ニュアンス付きで綺麗に描画する。
 */
export function renderPeerReply(payload) {
  const translatedText = payload?.translatedText || payload?.en || '';
  const translationJa = payload?.translationJa || payload?.ja || '';
  const grammarNote = payload?.grammarNote || '';
  const nuance = payload?.nuance || '';

  const chatArea = document.getElementById('chat-area');
  if (!chatArea) return null;

  // 1. 相手（Peer / Alex）のバブル構造を構築
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-bubble flex items-end gap-3 max-w-[85%]';

  // アバターアイコン
  const avatar = document.createElement('div');
  avatar.className = 'w-8 h-8 bg-sky-950 text-sky-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-sky-800';
  avatar.textContent = 'A';
  wrapper.appendChild(avatar);

  const contentCol = document.createElement('div');
  contentCol.className = 'space-y-1 min-w-0';

  // 本文バブル（英語訳）
  const bubbleText = document.createElement('div');
  bubbleText.className = 'bubble-text bg-slate-800 border border-slate-700 text-slate-200 p-3.5 rounded-2xl rounded-bl-none text-sm shadow-md break-all whitespace-pre-wrap';
  
  // ハイライト適用して英語本文をセット
  renderHighlightedText(bubbleText, translatedText);
  contentCol.appendChild(bubbleText);

  // 2. 日本語訳の追加
  if (translationJa) {
    const jaEl = document.createElement('p');
    jaEl.className = 'text-xs text-sky-300/90 pt-1 font-sans';
    jaEl.textContent = translationJa;
    contentCol.appendChild(jaEl);
  }

  // 3. 文法解説がある場合はトグルボタンと解説カードを追加
  if (grammarNote && grammarNote.trim() !== '') {
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'grammar-toggle-btn text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer pt-1 block';
    toggleBtn.title = '文法解説を表示';
    toggleBtn.textContent = '📖 文法解説';

    const note = document.createElement('div');
    // 最初は隠しておく（grammar.js の委譲イベントで toggleBtn から .grammar-note の hidden が切り替わる）
    note.className = 'grammar-note hidden text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 space-y-1 mt-1';

    const grammarLine = document.createElement('p');
    grammarLine.textContent = grammarNote;
    note.appendChild(grammarLine);

    if (nuance && nuance.trim() !== '') {
      const nuanceLine = document.createElement('p');
      nuanceLine.className = 'nuance-note text-slate-400 italic pt-0.5 border-t border-slate-800/60 mt-1';
      nuanceLine.textContent = `💬 ${nuance}`;
      note.appendChild(nuanceLine);
    }

    contentCol.appendChild(toggleBtn);
    contentCol.appendChild(note);
  }

  // メタ情報（受信）
  const meta = document.createElement('p');
  meta.className = 'text-[10px] text-slate-500 font-mono';
  meta.textContent = '受信';
  contentCol.appendChild(meta);

  wrapper.appendChild(contentCol);
  chatArea.appendChild(wrapper);

  // 最下部にスクロール
  chatArea.scrollTop = chatArea.scrollHeight;

  return wrapper;
}

// chat.js から送出されるカスタムイベントをキャッチして描画を実行
document.addEventListener('chat:apiReplyReceived', (e) => {
  console.log('[TranslationJS] API返信イベントを受信:', e.detail);
  renderPeerReply(e.detail);
});