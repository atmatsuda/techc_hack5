// js/translation.js
// 担当範囲：受信メッセージの地球儀アイコン制御・翻訳疑似処理（詳細設計書 3.3節 / 4章 参照）
import { addChatBubble } from './chat.js';
import { renderHighlightedText } from './phrase-visualizer.js';

const timerRegistry = new WeakMap();     // bubbleElement -> timeoutId（弱参照でGC可能）
const activeBubbles = new Set();         // 一括操作用の索引（アクティブなバブルのみ保持）
const phraseMapRegistry = new WeakMap(); // bubbleElement -> 実APIのreply.phraseMap（メッセージ単位）

function renderGlobeIcon(container) {
  container.textContent = ''; // innerHTMLではなくtextContentでクリア
  const icon = document.createElement('span');
  icon.className = 'translation-globe inline-block animate-spin';
  icon.setAttribute('aria-label', '翻訳中');
  icon.textContent = '🌐';
  container.appendChild(icon);
}

function attachTranslationCaption(bubbleEl, translationJa) {
  if (bubbleEl.querySelector('.translation-caption')) return;
  const bubbleText = bubbleEl.querySelector('.bubble-text');
  if (!bubbleText) return;

  // 英語フレーズ（bubble-text）のすぐ下に、常時表示の日本語訳キャプションとして添える。
  const caption = document.createElement('p');
  caption.className = 'translation-caption text-[11px] text-slate-400 italic mt-0.5';
  caption.textContent = translationJa;
  bubbleText.insertAdjacentElement('afterend', caption);
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

  // 実API経由のメッセージ単位phraseMapがあればそれを優先し、無ければ
  // renderHighlightedText側のデフォルト（mock-data.jsのグローバルphraseMap）にフォールバックする。
  const messagePhraseMap = phraseMapRegistry.get(bubbleEl);
  if (messagePhraseMap) {
    renderHighlightedText(bubbleText, bubbleEl.dataset.pendingTranslation ?? '', messagePhraseMap);
  } else {
    renderHighlightedText(bubbleText, bubbleEl.dataset.pendingTranslation ?? '');
  }

  if (bubbleEl.dataset.pendingTranslationJa) {
    attachTranslationCaption(bubbleEl, bubbleEl.dataset.pendingTranslationJa);
  }

  if (bubbleEl.dataset.pendingGrammarNote) {
    attachGrammarNote(bubbleEl, bubbleEl.dataset.pendingGrammarNote);
  }

  delete bubbleEl.dataset.pendingTranslation;
  delete bubbleEl.dataset.pendingTranslationJa;
  delete bubbleEl.dataset.pendingGrammarNote;
  phraseMapRegistry.delete(bubbleEl);
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
 * による疑似遅延を経て、英語フレーズ本文（＋任意で日本語訳キャプション・文法解説・
 * メッセージ単位phraseMap）へ差し替える。
 * このアプリは英語学習が目的のため、フレーズハイライトと文法解説の対象は
 * translatedText（英語側）であり、translationJa（日本語訳）は補足キャプションとして
 * 常時表示される点に注意。
 * @param {{translatedText: string, translationJa?: string, grammarNote?: string, phraseMap?: Object}} payload
 * @param {AbortSignal} [signal] 省略時はこの呼び出し単独のAbortControllerを生成する
 * @returns {HTMLElement|null} 生成したチャットバブル要素（.chat-bubble）
 */
export function receivePeerMessage(payload, signal) {
  const { translatedText, translationJa, grammarNote, phraseMap } = payload;

  // addChatBubbleはisValidMessageで空文字を弾くため、アイコン表示用のプレースホルダを渡す
  const bubble = addChatBubble('🌐', 'peer');
  if (!bubble) return null;

  const bubbleText = bubble.querySelector('.bubble-text');
  renderGlobeIcon(bubbleText);

  bubble.dataset.pendingTranslation = translatedText;
  if (translationJa) {
    bubble.dataset.pendingTranslationJa = translationJa;
  }
  if (grammarNote) {
    bubble.dataset.pendingGrammarNote = grammarNote;
  }
  if (phraseMap) {
    phraseMapRegistry.set(bubble, phraseMap);
  }

  const effectiveSignal = signal ?? new AbortController().signal;
  startTranslationTimer(bubble, effectiveSignal);

  return bubble;
}

// chat.js（実API呼び出し担当）からの'chat:apiReplyReceived'を受け取り、
// このモジュールの地球儀アイコン→疑似遅延→フレーズハイライト・文法解説のパイプラインで描画する。
// 循環import（chat.js <-> translation.js）を避けるため、直接importではなくCustomEvent経由で連携する。
document.addEventListener('chat:apiReplyReceived', (e) => {
  receivePeerMessage(e.detail);
});
