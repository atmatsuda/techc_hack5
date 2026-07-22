// js/mock-data.js

// ※このphraseMapは現時点ではグローバル1個の想定。
// バックエンドAPI（POST /api/chat/send）は本来メッセージ単位でphraseMapを返す設計だが、
// 今回はモック完結の方針のため未対応。
// 実API接続時にはtranslation.js/phrase-visualizer.js側でメッセージ単位に変換する対応が必要になる点に注意。
export const phraseMap = {
  // 既存のモックデータ...
};
