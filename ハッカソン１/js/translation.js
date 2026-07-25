// js/translation.js
// 担当範囲：受信メッセージの地球儀アイコン制御・翻訳疑似処理（詳細設計書 3.3節 / 4章 参照）
import { addChatBubble } from './chat.js';
import { renderHighlightedText } from './phrase-visualizer.js';

const timerRegistry = new WeakMap(); // bubbleElement -> timeoutId（弱参照でGC可能）
const activeBubbles = new Set();     // 一括操作用の索引（アクティブなバブルのみ保持）

function renderGlobeIcon(container) {
  container.textContent = ''; // innerHTMLではなくtextContentでクリア
  const icon = document.createElement('span');
  icon.className = 'translation-globe inline-block animate-spin';
  icon.setAttribute('aria-label', '翻訳中');
  icon.textContent = '🌐';
  container.appendChild(icon);
}

function attachGrammarNote(bubbleEl, grammarNote) {
  if (bubbleEl.querySelector('.grammar-note')) return;
  const contentCol = bubbleEl.querySelector('.bubble-text')?.parentElement;
  if (!contentCol) return;

  // クリックの起点となるアイコン（開閉自体はgrammar.jsのtoggleGrammarNoteが担当）
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'grammar-toggle-btn text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer';
  toggleBtn.title = '文法解説を表示';
  toggleBtn.textContent = '📖 文法解説';
  contentCol.insertBefore(toggleBtn, contentCol.lastElementChild);

  const note = document.createElement('p');
  note.className = 'grammar-note hidden text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2';
  note.textContent = grammarNote;
  contentCol.insertBefore(note, contentCol.lastElementChild);
}

function completeTranslation(bubbleEl) {
  const bubbleText = bubbleEl.querySelector('.bubble-text');
  if (!bubbleText) return;

  renderHighlightedText(bubbleText, bubbleEl.dataset.pendingTranslation ?? '');

  if (bubbleEl.dataset.pendingGrammarNote) {
    attachGrammarNote(bubbleEl, bubbleEl.dataset.pendingGrammarNote);
  }

  delete bubbleEl.dataset.pendingTranslation;
  delete bubbleEl.dataset.pendingGrammarNote;
}

function cleanupBubbleTimer(bubbleEl) {
  timerRegistry.delete(bubbleEl);
  activeBubbles.delete(bubbleEl);
}

/**
 * バブル単位の翻訳疑似タイマーを開始する（1.2〜2.0秒後に完了）。
 * AbortSignalはsetTimeoutにネイティブ対応しないため、abortイベントでclearTimeoutを橋渡しする。
 * 通話開始等で一括中断したい場合は、呼び出し側のAbortControllerのsignalを渡す。
 * @param {HTMLElement} bubbleEl 対象のチャットバブル要素（.chat-bubble、chat.jsのaddChatBubbleが返す要素）
 * @param {AbortSignal} signal 中断用シグナル
 */
export function startTranslationTimer(bubbleEl, signal) {
  const timeoutId = setTimeout(() => {
    completeTranslation(bubbleEl);
    cleanupBubbleTimer(bubbleEl);
  }, 1200 + Math.random() * 800); // 疑似遅延

  timerRegistry.set(bubbleEl, timeoutId);
  activeBubbles.add(bubbleEl);

  signal.addEventListener('abort', () => {
    clearTimeout(timerRegistry.get(bubbleEl));
    cleanupBubbleTimer(bubbleEl);
  });
}

/**
 * 相手からのメッセージ受信を表現するエントリーポイント。
 * chat.js の addChatBubble でバブルを即座に描画し、地球儀アイコン表示 → startTranslationTimer
 * による疑似遅延を経て、翻訳済みテキスト（＋任意で文法解説）へ差し替える。
 * @param {{translatedText: string, grammarNote?: string}} payload
 * @param {AbortSignal} [signal] 省略時はこの呼び出し単独のAbortControllerを生成する
 * @returns {HTMLElement|null} 生成したチャットバブル要素（.chat-bubble）
 */
export function receivePeerMessage(payload, signal) {
  const { translatedText, grammarNote } = payload;

  // addChatBubbleはisValidMessageで空文字を弾くため、アイコン表示用のプレースホルダを渡す
  const bubble = addChatBubble('🌐', 'peer');
  if (!bubble) return null;

  const bubbleText = bubble.querySelector('.bubble-text');
  renderGlobeIcon(bubbleText);

  bubble.dataset.pendingTranslation = translatedText;
  if (grammarNote) {
    bubble.dataset.pendingGrammarNote = grammarNote;
  }

  const effectiveSignal = signal ?? new AbortController().signal;
  startTranslationTimer(bubble, effectiveSignal);

  return bubble;
}
