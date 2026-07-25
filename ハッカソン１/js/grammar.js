// js/grammar.js
// 担当範囲：文法解説エリアの開閉（詳細設計書 3.6節 / 4章 参照）

/**
 * 文法解説エリア（.grammar-note）の表示/非表示を切り替える。
 * @param {HTMLElement} triggerEl クリックされたアイコン要素（.chat-bubble内に存在する想定）
 */
export function toggleGrammarNote(triggerEl) {
  const note = triggerEl.closest('.chat-bubble')?.querySelector('.grammar-note');
  note?.classList.toggle('hidden');
}

// 動的に追加される .grammar-toggle-btn（translation.js が生成）をイベント委譲で拾う。
document.addEventListener('click', (e) => {
  const triggerEl = e.target.closest('.grammar-toggle-btn');
  if (!triggerEl) return;
  toggleGrammarNote(triggerEl);
});
