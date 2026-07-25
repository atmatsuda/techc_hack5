// js/phrase-visualizer.js
// 担当範囲：フレーズハイライト（DocumentFragment構築）・ツールチップ表示（詳細設計書 3.2節 / 4章 参照）
import { phraseMap } from './mock-data.js';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPhraseRegex(map) {
  // 長いフレーズを優先してマッチさせるため、文字数の降順にソート
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return null;
  const pattern = keys.map(escapeRegExp).join('|');
  return new RegExp(pattern, 'g'); // 呼び出しのたびに新規生成（lastIndex汚染防止）
}

/**
 * テキスト中のphraseMap登録済みフレーズを .phrase スパンへ置き換えて描画する。
 * innerHTMLは使用せず、DocumentFragment + textContent/createTextNodeで安全に構築する。
 * @param {HTMLElement} container 描画先要素（中身はクリアされる）
 * @param {string} text 描画対象のテキスト
 * @param {Object<string, {id: string, explanation: string}>} [map] フレーズ対応表（省略時はmock-data.jsのphraseMap）
 */
export function renderHighlightedText(container, text, map = phraseMap) {
  container.textContent = ''; // innerHTMLではなくtextContentでクリア

  const regex = buildPhraseRegex(map);
  if (!regex) {
    container.appendChild(document.createTextNode(text));
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前の非マッチ区間はテキストノード
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const entry = map[match[0]];
    const span = document.createElement('span');
    span.className = 'phrase underline decoration-dotted decoration-sky-400 underline-offset-2 cursor-pointer';
    span.dataset.phraseId = entry.id;
    span.dataset.explanation = entry.explanation; // ツールチップ表示用に直接保持（idからの逆引きを不要にする）
    span.textContent = match[0]; // textContentでエスケープを保証

    fragment.appendChild(span);
    lastIndex = regex.lastIndex;
  }

  // 残りの非マッチ区間
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  container.appendChild(fragment); // 一括append
}

document.addEventListener('click', (e) => {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  const phraseEl = e.target.closest('.phrase');
  if (!phraseEl) {
    tooltip.classList.add('hidden'); // 外側クリックで非表示
    return;
  }

  const rect = phraseEl.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`; // 固定オフセット（スコープアウト：はみ出し補正は行わない）
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.textContent = phraseEl.dataset.explanation ?? '';
  tooltip.classList.remove('hidden');
});
