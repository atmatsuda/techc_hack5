# [AI翻訳チャット＋通話アプリ（仮）] JavaScript詳細設計書（Step 4）

本書は「01_js_proposal.md」「02_js_requirement_definition.md」で合意した要件、および「Step 3：壁打ちレビュー」で議論・合意した堅牢性/セキュリティ対策を反映した詳細設計書である。

---

## 1. 全体アーキテクチャ方針

### 1.1 設計原則（壁打ちレビューでの合意事項）

| # | 原則 | 概要 |
|---|------|------|
| 1 | XSS対策 | ユーザー由来・外部由来の文字列をDOMに挿入する際は`innerHTML`を使用しない |
| 2 | Single Source of Truth (SSOT) | 横断的な状態は`AppState`に集約し、**変更経路をsetterメソッドに限定**する |
| 3 | 多層防御（Defense in Depth） | 入力元でのバリデーションと、描画直前の最終ガードを両方設ける |
| 4 | 責務分離 | イベントは「通知」、状態変更は「AppStateのメソッド」が担う |
| 5 | 名前空間分離 | 機能ごとにモジュール／IIFE／クラスでスコープを閉じる |

### 1.2 ファイル構成

```
/index.html
/js
 ├─ app-state.js        … グローバル状態ストア（AppState）
 ├─ validation.js        … 共通バリデーション関数（isValidMessage 等）
 ├─ chat.js              … チャット送受信・吹き出し描画
 ├─ animation.js         … 紙飛行機アニメーション・画面遷移アニメーション
 ├─ call.js              … 通話モック・経過タイマー
 ├─ translation.js       … 地球儀アイコン・翻訳疑似処理
 ├─ archive.js           … localStorage保存/読込
 ├─ grammar.js           … 文法解説エリアの開閉
 ├─ phrase-visualizer.js … フレーズハイライト・ツールチップ
 ├─ expression-list.js   … 表現の「型」タブ・フィルタリング
 └─ main.js              … 各モジュールの初期化・イベント登録の起点
```

- 各ファイルは`<script type="module" defer>`で読み込み、モジュールスコープにより変数衝突を回避する。
- `main.js`のみをHTMLから読み込み、他は`import`で連結する（バンドラは今回のスコープでは導入しない）。

---

## 2. グローバル状態管理設計（AppState）

### 2.1 設計方針

- 状態オブジェクト`state`はモジュール内に**完全に隠蔽**し、外部からは`getState()`（複製を返す）と各`setXxx`メソッド経由でのみアクセス可能とする。
- `CustomEvent`は「何が起きたか」を伝える通知専用とし、状態変更ロジックは持たない。イベントリスナーは受け取ったら`AppState`のメソッドを呼ぶだけに徹する。

### 2.2 実装（app-state.js）

```javascript
// app-state.js
const state = {
  chat: { isSending: false, isLocked: false },
  call: { isAnimating: false, isLocked: false, elapsedSeconds: 0 },
  translation: { isRendering: false },
  ui: { isTransitioning: false }, // 画面遷移中の全体ロック用フラグ
};

function setChatSending(value) {
  state.chat.isSending = value;
}

function setGlobalLock(value) {
  // オーバーレイ表示・非表示と連動する唯一のフラグ
  state.ui.isTransitioning = value;
}

function setCallAnimating(value) {
  state.call.isAnimating = value;
}

function setCallElapsed(seconds) {
  state.call.elapsedSeconds = seconds;
}

function setTranslationRendering(messageId, value) {
  // メッセージ単位の翻訳状態は別途 Map で管理（3.3節参照）。
  // ここでは「翻訳処理が1件以上進行中か」の集約フラグのみ扱う。
  state.translation.isRendering = value;
}

function getState() {
  return structuredClone(state); // 読み取りは常にスナップショット（防御的コピー）
}

export const AppState = {
  setChatSending,
  setGlobalLock,
  setCallAnimating,
  setCallElapsed,
  setTranslationRendering,
  getState,
};
```

### 2.3 イベント駆動との連携例

```javascript
// call.js 内
document.addEventListener('call:started', () => {
  AppState.setCallAnimating(true);
  AppState.setGlobalLock(true); // 画面遷移アニメーション中は全体ロック
});

document.addEventListener('call:transitionEnded', () => {
  AppState.setGlobalLock(false); // アニメーション完了でロック解除
});
```

---

## 3. 機能別詳細設計

### 3.1 入力ロック・連打防止（オーバーレイ方式）

**合意内容：** 個々のボタンへのフラグ分散ではなく、透明オーバーレイによる物理的なクリック吸収を採用。ただしキーボード操作の迂回に備えた二段ガードを併用する。

```html
<div id="input-lock-overlay" class="hidden" aria-hidden="true"></div>
```

```javascript
// animation.js
function lockUI() {
  AppState.setGlobalLock(true);
  document.getElementById('input-lock-overlay').classList.remove('hidden');
  document.getElementById('chat-input').blur(); // キーボード迂回対策：フォーカス解除
}

function unlockUI() {
  AppState.setGlobalLock(false);
  document.getElementById('input-lock-overlay').classList.add('hidden');
}
```

**二段ガードの実装：** Enterキー送信ハンドラでも`isLocked`を明示チェックする。

```javascript
// chat.js
chatInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (AppState.getState().ui.isTransitioning) return; // オーバーレイを迂回した場合の保険
  sendMessage();
});
```

**通話ボタンの例外扱い：** オーバーレイの`z-index`を、通話ボタンより下・他要素より上に設定することでCSSレイヤーのみで例外を表現する。

```css
#input-lock-overlay { z-index: 500; }
#call-btn            { z-index: 600; } /* オーバーレイより上＝押下可能 */
#send-btn, .tab-btn, #archive-save-btn { z-index: auto; } /* オーバーレイ以下＝ブロック対象 */
```

---

### 3.2 XSS対策・フレーズハイライトのDOM構築

**合意内容：** `innerHTML`不使用。正規表現エスケープ＋`DocumentFragment`による安全な部分置換。

```javascript
// phrase-visualizer.js
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPhraseRegex(phraseMap) {
  // 長いフレーズを優先してマッチさせるため、文字数の降順にソート
  const keys = Object.keys(phraseMap).sort((a, b) => b.length - a.length);
  const pattern = keys.map(escapeRegExp).join('|');
  return new RegExp(pattern, 'g'); // 呼び出しのたびに新規生成（lastIndex汚染防止）
}

function renderHighlightedText(container, text, phraseMap) {
  container.textContent = ''; // innerHTMLではなくtextContentでクリア

  const regex = buildPhraseRegex(phraseMap);
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前の非マッチ区間はテキストノード
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
    }
    // マッチ区間は <span class="phrase" data-phrase-id="...">
    const span = document.createElement('span');
    span.className = 'phrase';
    span.dataset.phraseId = phraseMap[match[0]].id;
    span.textContent = match[0]; // ここも textContent でエスケープを保証
    fragment.appendChild(span);

    lastIndex = regex.lastIndex;
  }
  // 残りの非マッチ区間
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  container.appendChild(fragment); // 一括append
}
```

**ツールチップ表示（固定オフセット・スコープアウト範囲順守）：**

```javascript
document.addEventListener('click', (e) => {
  const phraseEl = e.target.closest('.phrase');
  const tooltip = document.getElementById('tooltip');

  if (!phraseEl) {
    tooltip.classList.add('hidden'); // 外側クリックで非表示
    return;
  }
  const rect = phraseEl.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`; // 固定オフセット
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.textContent = phraseMap[phraseEl.dataset.phraseId]?.explanation ?? '';
  tooltip.classList.remove('hidden');
});
```

---

### 3.3 タイマー管理設計（AbortController軸 + WeakMap/Set補助）

**合意内容：**
- 「まとまった単位でのキャンセル」（通話切断・画面遷移中断）は`AbortController`が担う。
- 「特定バブル1件だけを個別に参照・キャンセルしたい」場面は`WeakMap`（メモリリーク防止）＋`Set`（反復・一括クリア用の索引）で補助する。
- `AbortSignal`は`setTimeout`にネイティブ対応しないため、`abort`イベントで`clearTimeout`を明示的に橋渡しする。

```javascript
// translation.js
const timerRegistry = new WeakMap(); // bubbleElement -> timeoutId（弱参照でGC可能）
const activeBubbles = new Set();     // 一括操作用の索引（アクティブなバブルのみ保持）

let callAbortController = null;

function startTranslationTimer(bubbleEl, signal) {
  const timeoutId = setTimeout(() => {
    completeTranslation(bubbleEl);
    cleanupBubbleTimer(bubbleEl); // 正常完了時も索引から除去
  }, 1200 + Math.random() * 800); // 疑似遅延

  timerRegistry.set(bubbleEl, timeoutId);
  activeBubbles.add(bubbleEl);

  // AbortControllerとの橋渡し（signal.abort()だけではsetTimeoutは止まらない）
  signal.addEventListener('abort', () => {
    clearTimeout(timerRegistry.get(bubbleEl));
    cleanupBubbleTimer(bubbleEl);
  });
}

function cleanupBubbleTimer(bubbleEl) {
  timerRegistry.delete(bubbleEl);
  activeBubbles.delete(bubbleEl);
}

// 通話開始時：それまでの翻訳待ちなどを一括中断したい場合
function startCall() {
  callAbortController = new AbortController();
  document.dispatchEvent(new CustomEvent('call:started'));
}

function endCall() {
  callAbortController?.abort(); // 紐づく全タイマーのabortイベントが発火 → clearTimeout実行
  callAbortController = null;
  document.dispatchEvent(new CustomEvent('call:ended'));
}
```

**通話経過タイマー（`setInterval`、単一IDのため通常変数で管理）：**

```javascript
// call.js
let callIntervalId = null;

function startCallTimer() {
  let elapsed = 0;
  callIntervalId = setInterval(() => {
    elapsed += 1;
    AppState.setCallElapsed(elapsed);
    renderCallTimerDisplay(elapsed); // 00:00 形式にフォーマットして表示
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callIntervalId); // 通話終了時に確実に停止
  callIntervalId = null;
}

document.addEventListener('call:ended', stopCallTimer);
```

---

### 3.4 入力バリデーション（共通関数の一元化）

**合意内容：** `isValidMessage()`を純粋関数として切り出し、「送信ボタンの活性制御」「`sendMessage()`内ガード」「`localStorage`読込時のフィルタリング」「描画関数内の最終防衛ライン」の**4箇所**すべてから同一関数を呼ぶ。

```javascript
// validation.js
export function isValidMessage(text) {
  return typeof text === 'string' && text.trim().length > 0;
}
```

```javascript
// chat.js — ① 送信ボタンの活性/非活性
chatInput.addEventListener('input', () => {
  sendBtn.disabled = !isValidMessage(chatInput.value);
});

// ② sendMessage() 内のガード
function sendMessage() {
  const text = chatInput.value;
  if (!isValidMessage(text)) return; // 二重ガード
  addChatBubble(text.trim(), 'me');
  chatInput.value = '';
  sendBtn.disabled = true;
  playFlyAnimation(/* ... */);
}

// ④ 描画関数自体の最終防衛ライン
function addChatBubble(text, sender) {
  if (!isValidMessage(text)) return; // 呼び出し元に関わらず不正データを弾く
  // ...DOM構築処理（3.2節のtextContentベースの安全な構築に準拠）
  chatArea.scrollTop = chatArea.scrollHeight; // 自動スクロール
}
```

```javascript
// archive.js — ③ localStorage読込時のフィルタリング + 構造検証
function loadArchive() {
  const raw = localStorage.getItem('chatHistory');
  if (raw === null) {
    showArchiveMessage('保存データがありません');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    showArchiveMessage('保存データの形式が不正です');
    return;
  }

  if (!Array.isArray(parsed)) {
    showArchiveMessage('保存データの形式が不正です');
    return;
  }

  // 型・構造チェック + 共通バリデーション関数の再利用
  const cleaned = parsed.filter(
    (item) =>
      item &&
      typeof item.sender === 'string' &&
      isValidMessage(item.text)
  );

  // 注意：localStorageへの書き戻しは行わない
  // （要件定義書「アーカイブ機能の自動保存」禁止事項との整合性を優先）
  renderChatHistory(cleaned); // メモリ上のフィルタ結果のみ画面反映
}
```

> **設計メモ：** 「自己修復（フィルタ結果の書き戻し）」は要件定義書のスコープアウト事項（明示的保存のみ）と衝突するため不採用。将来的に恒久除去が必要になった場合は、ユーザー確認ダイアログを挟む方式、またはバージョニングによるマイグレーション処理として別途要件化する。

---

### 3.5 画面遷移アニメーション（チャット⇄通話）

```javascript
// animation.js
async function transitionToCallScreen() {
  lockUI(); // 3.1節のオーバーレイロック
  chatScreen.classList.add('slide-out');
  callScreen.classList.add('slide-in');

  await waitForTransitionEnd(callScreen); // transitionend待ち

  document.dispatchEvent(new CustomEvent('call:transitionEnded'));
  unlockUI();
}

function waitForTransitionEnd(el) {
  return new Promise((resolve) => {
    el.addEventListener('transitionend', resolve, { once: true });
  });
}
```

---

### 3.6 文法解説の開閉

```javascript
// grammar.js
function toggleGrammarNote(triggerEl) {
  const note = triggerEl.closest('.chat-bubble')?.querySelector('.grammar-note');
  note?.classList.toggle('hidden');
}
```

---

### 3.7 表現の「型」一覧（タブ切り替え・固定グルーピング）

```javascript
// expression-list.js
function renderExpressionList(axis, sceneGroups, expressionData) {
  const container = document.getElementById('expression-list');
  container.textContent = '';

  const fragment = document.createDocumentFragment();
  sceneGroups.forEach((group) => {
    const heading = document.createElement('h3');
    heading.textContent = group.label; // textContentベース
    fragment.appendChild(heading);

    const items = expressionData.filter((item) => item[axis] === group.value);
    const list = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      list.appendChild(li);
    });
    fragment.appendChild(list);
  });

  container.appendChild(fragment);
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderExpressionList(btn.dataset.axis, sceneGroups, expressionData);
  });
});
```

---

## 4. スコープ管理・モジュール境界のまとめ

| モジュール | 公開インターフェース | 非公開（モジュールスコープ内） |
|---|---|---|
| `app-state.js` | `setChatSending` / `setGlobalLock` / `setCallAnimating` / `setCallElapsed` / `setTranslationRendering` / `getState` | `state`（生オブジェクト） |
| `validation.js` | `isValidMessage` | なし |
| `chat.js` | `sendMessage` / `addChatBubble` | `chatInput`, `sendBtn`等のDOM参照 |
| `call.js` | `startCall` / `endCall` / `startCallTimer` / `stopCallTimer` | `callIntervalId` |
| `translation.js` | `startTranslationTimer` | `timerRegistry`(WeakMap) / `activeBubbles`(Set) |
| `archive.js` | `saveArchive` / `loadArchive` | — |
| `grammar.js` | `toggleGrammarNote` | — |
| `phrase-visualizer.js` | `renderHighlightedText` | `buildPhraseRegex` |
| `expression-list.js` | `renderExpressionList` | — |

全モジュールは`<script type="module" defer>`で読み込み、`import/export`のみで公開範囲を制御する。グローバルスコープに直接置かれるのは各モジュールの公開関数のみとし、内部状態・作業変数は一切露出させない。

---

## 5. 実装時チェックリスト（Step 3レビュー結果の反映確認用）

- [ ] フレーズハイライトは`innerHTML`を使わず`DocumentFragment` + `textContent`で構築しているか
- [ ] 正規表現は毎回新規生成、または`lastIndex`をリセットしているか
- [ ] オーバーレイの`z-index`設計で通話ボタンのみ例外化できているか
- [ ] Enterキー送信経路にも`isLocked`（`AppState.getState().ui.isTransitioning`）チェックが入っているか
- [ ] `setTimeout`は`AbortSignal`非対応である前提で、`abort`イベントに`clearTimeout`を明示的に紐付けているか
- [ ] `WeakMap`のキーにDOM要素参照を使い、反復用索引として`Set`を併用しているか
- [ ] `isValidMessage()`が送信ボタン制御／`sendMessage()`／`localStorage`読込／描画関数の4箇所全てで再利用されているか
- [ ] `localStorage`読込時に`try...catch`と配列・構造チェックを行っているか
- [ ] フィルタ後データの`localStorage`への自動書き戻しを行っていないか（要件のスコープアウト事項順守）
- [ ] `AppState`への書き込みが`setXxx`系メソッド経由のみに限定されているか（プロパティ直接代入がないか）
- [ ] `CustomEvent`のリスナー内で状態を直接書き換えず、`AppState`のメソッド呼び出しに徹しているか
- [ ] 各機能が`<script type="module">`でスコープ分離されているか
