// js/expression-list.js
// 担当範囲：表現の「型」タブ切り替え・固定グルーピングによる一覧描画（詳細設計書 3.7節 / 4章 参照）

// 表現の「型」一覧の元データ（モック）。1件につき scene/formality/emotion の3軸属性を持つ。
// ja: 日本語訳。コピペ用テンプレだけでは意味が分かりにくいという指摘を受け、
// 英文の下に小さな補足キャプションとして表示するために追加。
const expressionData = [
  { text: 'Could you tell me more about that?', ja: 'それについてもっと教えていただけますか？', scene: 'business', formality: 'high', emotion: 'neutral' },
  { text: 'I really appreciate your help with this.', ja: '手伝っていただき本当に感謝しています。', scene: 'business', formality: 'high', emotion: 'positive' },
  { text: 'Sounds good, let’s do that!', ja: 'いいですね、それにしましょう！', scene: 'daily', formality: 'low', emotion: 'positive' },
  { text: 'Hey, what’s up?', ja: 'やあ、調子どう？', scene: 'daily', formality: 'low', emotion: 'neutral' },
  { text: 'I’m so sorry to hear that.', ja: 'それは本当にお気の毒です。', scene: 'daily', formality: 'neutral', emotion: 'negative' },
  { text: 'Excuse me, where is the nearest station?', ja: 'すみません、一番近い駅はどこですか？', scene: 'travel', formality: 'neutral', emotion: 'neutral' },
  { text: 'This is amazing, I love it here!', ja: 'これはすごい、ここが大好きです！', scene: 'travel', formality: 'low', emotion: 'positive' },
  { text: 'I’m afraid we have to reschedule the meeting.', ja: '申し訳ありませんが、会議の予定を変更する必要があります。', scene: 'business', formality: 'high', emotion: 'negative' },
];

// 軸ごとの固定グルーピング定義（見出し＋絞り込み値）。動的な値自動検出は行わない。
const groupsByAxis = {
  scene: [
    { value: 'daily', label: '日常会話' },
    { value: 'business', label: 'ビジネス' },
    { value: 'travel', label: '旅行・観光' },
  ],
  formality: [
    { value: 'high', label: 'フォーマル度：高' },
    { value: 'neutral', label: 'フォーマル度：中' },
    { value: 'low', label: 'フォーマル度：低' },
  ],
  emotion: [
    { value: 'positive', label: 'ポジティブ' },
    { value: 'neutral', label: '中立' },
    { value: 'negative', label: 'ネガティブ' },
  ],
};

/**
 * 選択中の軸に応じて #expression-list を再描画する。
 * innerHTMLは使用せず、DocumentFragment + textContentで構築する。
 * @param {'scene'|'formality'|'emotion'} axis
 */
export function renderExpressionList(axis) {
  const container = document.getElementById('expression-list');
  if (!container) return;

  container.textContent = '';

  const groups = groupsByAxis[axis] ?? [];
  const fragment = document.createDocumentFragment();

  groups.forEach((group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'expression-group border border-slate-700/60 rounded-lg overflow-hidden mb-3';

    // グループ見出し自体がプルダウンの起点。押すと配下の表現が全部まとめて表示される
    const headingBtn = document.createElement('button');
    headingBtn.type = 'button';
    headingBtn.className = 'expression-group-toggle w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-xs font-bold text-slate-300 tracking-wide cursor-pointer bg-slate-800/60';
    headingBtn.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.textContent = group.label;
    headingBtn.appendChild(label);

    const caret = document.createElement('span');
    caret.className = 'expression-caret text-slate-500';
    caret.textContent = '▶';
    headingBtn.appendChild(caret);

    const list = document.createElement('ul');
    list.className = 'expression-group-body hidden divide-y divide-slate-700/60';

    const items = expressionData.filter((item) => item[axis] === group.value);
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'px-3 py-2';

      const enLine = document.createElement('p');
      enLine.className = 'expression-en font-bold text-slate-100 text-sm';
      enLine.textContent = item.text;
      li.appendChild(enLine);

      if (item.ja) {
        const jaLine = document.createElement('p');
        jaLine.className = 'expression-ja text-[11px] text-slate-400 italic mt-0.5';
        jaLine.textContent = item.ja;
        li.appendChild(jaLine);
      }

      list.appendChild(li);
    });

    headingBtn.addEventListener('click', () => {
      const nowHidden = list.classList.toggle('hidden');
      caret.textContent = nowHidden ? '▶' : '▼';
      headingBtn.setAttribute('aria-expanded', String(!nowHidden));
    });

    groupEl.appendChild(headingBtn);
    groupEl.appendChild(list);
    fragment.appendChild(groupEl);
  });

  container.appendChild(fragment);
}

const tabButtons = document.querySelectorAll('.tab-btn');
const tabBar = tabButtons[0]?.parentElement ?? null;
const expressionPanel = document.getElementById('expression-panel');

let sliderEl = null;

// スライダー方式：アクティブタブの背後を滑る錠剤状インジケーターをタブバーへ動的挿入する
function ensureSlider() {
  if (!tabBar || sliderEl) return;
  tabBar.classList.add('tab-bar');
  sliderEl = document.createElement('div');
  sliderEl.className = 'tab-slider';
  tabBar.insertBefore(sliderEl, tabBar.firstChild);
}

function moveSliderTo(btn) {
  if (!sliderEl || !btn) return;
  sliderEl.style.width = `${btn.offsetWidth}px`;
  sliderEl.style.transform = `translateX(${btn.offsetLeft}px)`;
}

ensureSlider();

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    moveSliderTo(btn);
    renderExpressionList(btn.dataset.axis);
  });
});

// 初期状態でHTML側の active タブ（data-axis="scene"）に合わせて初回描画する
const initialTab = document.querySelector('.tab-btn.active') ?? tabButtons[0];
if (initialTab) {
  renderExpressionList(initialTab.dataset.axis);
}

// #expression-panel は初期状態で hidden（display:none）のため、非表示中はタブの
// offsetWidth/offsetLeftが0になり正しい位置を計算できない。表示された瞬間に再計算する。
if (expressionPanel) {
  const panelObserver = new MutationObserver(() => {
    if (!expressionPanel.classList.contains('hidden')) {
      moveSliderTo(document.querySelector('.tab-btn.active') ?? tabButtons[0]);
    }
  });
  panelObserver.observe(expressionPanel, { attributes: true, attributeFilter: ['class'] });
}

window.addEventListener('resize', () => {
  if (expressionPanel && !expressionPanel.classList.contains('hidden')) {
    moveSliderTo(document.querySelector('.tab-btn.active') ?? tabButtons[0]);
  }
});