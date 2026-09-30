// js/phrase-visualizer.js
import { phraseMap } from './mock-data.js';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPhraseRegex(map) {
  if (!map || typeof map !== 'object') return null;
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return null;
  const pattern = keys.map(escapeRegExp).join('|');
  return new RegExp(pattern, 'g');
}

/**
 * テキスト中のphraseMap登録済みフレーズを .phrase スパンへ置き換えて描画する。
 */
export function renderHighlightedText(container, text, map = phraseMap) {
  container.textContent = ''; // 一旦クリア

  if (!text) return;

  const regex = buildPhraseRegex(map);
  if (!regex) {
    container.appendChild(document.createTextNode(text));
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const entry = map[match[0]];
    if (entry) {
      const span = document.createElement('span');
      span.className = 'phrase underline decoration-dotted decoration-sky-400 underline-offset-2 cursor-pointer';
      span.dataset.phraseId = entry.id || '';
      span.dataset.explanation = entry.explanation || '';
      span.textContent = match[0];
      fragment.appendChild(span);
    } else {
      fragment.appendChild(document.createTextNode(match[0]));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  container.appendChild(fragment);
}

document.addEventListener('click', (e) => {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  const phraseEl = e.target.closest('.phrase');
  if (!phraseEl) {
    tooltip.classList.add('hidden');
    return;
  }

  const rect = phraseEl.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.textContent = phraseEl.dataset.explanation ?? '';
  tooltip.classList.remove('hidden');
});