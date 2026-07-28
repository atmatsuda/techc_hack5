// js/translation.js
// 担当範囲：受信メッセージの地球儀アイコン制御・翻訳疑似処理（詳細設計書 3.3節 / 4章 参照）
import { addChatBubble } from './chat.js';
import { renderHighlightedText } from './phrase-visualizer.js';

const timerRegistry = new WeakMap(); // bubbleElement -> timeoutId（弱参照でGC可能）
const activeBubbles = new Set();     // 一括操作用の索引（アクティブなバブルのみ保持）

function renderGlobeIcon(container) {
  container.textContent = ''; // innerHTMLではなくtextContentでクリア

  // perspectiveをかけた親でY軸回転させることで、平面回転ではなく自転しているような立体感を出す
  const wrap = document.createElement('span');
  wrap.className = 'translation-globe-wrap';

  const icon = document.createElement('span');
  icon.className = 'translation-globe';
  icon.setAttribute('aria-label', '翻訳中');
  icon.textContent = '🌐';

  wrap.appendChild(icon);
  container.appendChild(wrap);
}

/**
 * 文法解説（grammarNote）＋ ネイティブの使用ニュアンス解説（nuance）を
 * 同じ開閉パネル（.grammar-note）にまとめて表示する。
 * トグル自体は grammar.js の toggleGrammarNote が `.grammar-note` を対象に行うため、
 * パネルの外枠（class="grammar-note"）は変えず、中身を複数行に分けて追加している。
 * @param {HTMLElement} bubbleEl 対象のチャットバブル要素
 * @param {string} grammarNote 文法構造の解説文
 * @param {string} [nuance] ネイティブの使用ニュアンス解説文（無ければ省略）
 */
function attachGrammarNote(bubbleEl, grammarNote, nuance) {
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

  const note = document.createElement('div');
  note.className = 'grammar-note hidden text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 space-y-1.5';

  const grammarLine = document.createElement('p');
  grammarLine.textContent = grammarNote;
  note.appendChild(grammarLine);

  if (nuance) {
    const nuanceLine = document.createElement('p');
    nuanceLine.className = 'nuance-note text-slate-400/80 italic';
    nuanceLine.textContent = `💬 ${nuance}`;
    note.appendChild(nuanceLine);
  }

  contentCol.insertBefore(note, contentCol.lastElementChild);
}

function completeTranslation(bubbleEl) {
  const bubbleText = bubbleEl.querySelector('.bubble-text');
  if (!bubbleText) return;

  renderHighlightedText(bubbleText, bubbleEl.dataset.pendingTranslation ?? '');

  if (bubbleEl.dataset.pendingGrammarNote) {
    attachGrammarNote(bubbleEl, bubbleEl.dataset.pendingGrammarNote, bubbleEl.dataset.pendingNuance);
  }

  delete bubbleEl.dataset.pendingTranslation;
  delete bubbleEl.dataset.pendingGrammarNote;
  delete bubbleEl.dataset.pendingNuance;
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
 * @param {{translatedText: string, grammarNote?: string, nuance?: string}} payload
 * @param {AbortSignal} [signal] 省略時はこの呼び出し単独のAbortControllerを生成する
 * @returns {HTMLElement|null} 生成したチャットバブル要素（.chat-bubble）
 */
export function receivePeerMessage(payload, signal) {
  const { translatedText, grammarNote, nuance } = payload;

  // addChatBubbleはisValidMessageで空文字を弾くため、アイコン表示用のプレースホルダを渡す
  const bubble = addChatBubble('🌐', 'peer');
  if (!bubble) return null;

  const bubbleText = bubble.querySelector('.bubble-text');
  renderGlobeIcon(bubbleText);

  bubble.dataset.pendingTranslation = translatedText;
  if (grammarNote) {
    bubble.dataset.pendingGrammarNote = grammarNote;
  }
  if (nuance) {
    bubble.dataset.pendingNuance = nuance;
  }

  const effectiveSignal = signal ?? new AbortController().signal;
  startTranslationTimer(bubble, effectiveSignal);

  return bubble;
}

// chat.js の attemptDelivery() は、API応答受信後に描画処理をこのイベント経由で
// translation.js に委譲する設計になっている（chat.js内コメント参照）。
// このリスナーが無いと、サーバー応答は正常でも相手側バブルが一切描画されない。
document.addEventListener('chat:apiReplyReceived', (e) => {
  receivePeerMessage(e.detail);
});