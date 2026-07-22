// js/validation.js

/** 送信メッセージの最大許容文字数 */
const MAX_MESSAGE_LENGTH = 1000;

/**
 * 入力メッセージのバリデーション関数
 * @param {string} text 入力テキスト
 * @returns {boolean} 有効なメッセージの場合 true
 */
export function isValidMessage(text) {
  return (
    typeof text === 'string' &&
    text.trim().length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH
  );
}
