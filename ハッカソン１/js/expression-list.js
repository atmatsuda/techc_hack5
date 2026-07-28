// js/expression-list.js
// 担当範囲：表現の「型」タブ切り替え・固定グルーピングによる一覧描画（詳細設計書 3.7節 / 4章 参照）

// 表現の「型」一覧の元データ（モック）。1件につき scene/formality/emotion の3軸属性を持つ。
// ja: 日本語訳。どの定型表現を選べばいいか一目で分かるよう、英文の下に補足キャプションとして表示する。
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
    const heading = document.createElement('h3');
    heading.className = 'text-xs font-bold text-slate-400 tracking-wide';
    heading.textContent = group.label;
    fragment.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'space-y-1.5 mb-3';

    const items = expressionData.filter((item) => item[axis] === group.value);
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'text-sm text-slate-200 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2';

      // 英文本体（メイン表示）
      const enLine = document.createElement('p');
      enLine.className = 'expression-en';
      enLine.textContent = item.text;
      li.appendChild(enLine);

      // 日本語訳（補足キャプション。小さく・薄く表示して、選択の手がかりにする）
      if (item.ja) {
        const jaLine = document.createElement('p');
        jaLine.className = 'expression-ja text-[11px] text-slate-400 italic mt-0.5';
        jaLine.textContent = item.ja;
        li.appendChild(jaLine);
      }

      list.appendChild(li);
    });

    fragment.appendChild(list);
  });

  container.appendChild(fragment);
}

const tabButtons = document.querySelectorAll('.tab-btn');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderExpressionList(btn.dataset.axis);
  });
});

// 初期状態でHTML側の active タブ（data-axis="scene"）に合わせて初回描画する
const initialTab = document.querySelector('.tab-btn.active') ?? tabButtons[0];
if (initialTab) {
  renderExpressionList(initialTab.dataset.axis);
}
