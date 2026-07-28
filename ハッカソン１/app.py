"""
app.py

AI翻訳チャット＋通話アプリ - バックエンドAPI (Flask)

担当: 川井田（プロジェクトリーダー / 基盤・バックエンド担当）

詳細設計書 4.2「メッセージ送信・AI翻訳 API (POST /api/chat/send)」に準拠。

現段階（7/24 対面MTGでの菅野くん担当フロントとの垂直統合・疎通確認用）では、
実際の翻訳・文法解析処理（OpenAI等の外部API連携）は行わず、
詳細設計書のレスポンス構造に完全準拠した「正常系のモックJSON」を返す。
実翻訳ロジックへの差し替えは後続タスクとする。

起動方法:
    pip install -r requirements.txt
    python app.py
    -> http://127.0.0.1:5000/api/chat/send で待受
"""

import os
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# .env があれば読み込む（将来的な OPENAI_API_KEY 等の管理用。現時点では未使用）
load_dotenv()

app = Flask(__name__)

# フロントエンド（file://や別ポートのlive-server等、別オリジン）からの
# fetch('http://127.0.0.1:5000/api/chat/send') を許可する。
CORS(app)

# JS側 validation.js の isValidMessage(text) と同一基準。
# 「多重防御」の原則（詳細設計書 原則3）に基づき、バックエンド側でも同じ上限チェックを行う。
MAX_MESSAGE_LENGTH = 1000


def validate_chat_request(data):
    """
    POST /api/chat/send のリクエストボディをバリデーションする。

    詳細設計書 4.2 の引数仕様（userId, text, sourceLang, targetLang, autoTranslate）
    のうち、必須項目である userId / text をチェックする。

    Args:
        data: request.get_json(silent=True) の結果（dict or None）

    Returns:
        tuple[bool, str]: (バリデーションOKか, エラーメッセージ)
    """
    if not isinstance(data, dict):
        return False, "リクエストボディが不正です（JSON形式で送信してください）。"

    text = data.get("text")
    if not isinstance(text, str):
        return False, "text は文字列である必要があります。"
    if len(text.strip()) == 0:
        return False, "text が空文字です。"
    if len(text) > MAX_MESSAGE_LENGTH:
        return False, f"text は最大{MAX_MESSAGE_LENGTH}文字までです。"

    user_id = data.get("userId")
    if not isinstance(user_id, str) or len(user_id.strip()) == 0:
        return False, "userId は必須です。"

    return True, ""


def build_mock_reply(text):
    """
    24日の疎通確認用モック応答を生成する。

    詳細設計書 4.2 のレスポンス構造
        reply: { en, ja, grammarNote, phraseMap }
    に完全準拠したダミーデータを返す。

    実際の翻訳・文法解析・phraseMap抽出ロジックは未実装（次フェーズで実API化）。
    """
    return {
        "en": text,
        "ja": "（モック応答）それについてもっと教えていただけますか？",
        "grammarNote": "「Could you ~?」は依頼を丁寧に行う定型表現です。",
        "phraseMap": {
            "Could you": {
                "id": "p001",
                "explanation": "丁寧な依頼を切り出す定型フレーズ。",
            }
        },
    }


@app.route("/api/chat/send", methods=["POST"])
def chat_send():
    data = request.get_json(silent=True)

    is_valid, error_message = validate_chat_request(data)
    if not is_valid:
        return (
            jsonify({"status": "error", "message": error_message}),
            400,
        )

    text = data["text"]
    message_id = f"msg_{uuid.uuid4().hex[:8]}"

    response_body = {
        "status": "success",
        "messageId": message_id,
        "reply": build_mock_reply(text),
    }

    return jsonify(response_body), 200


@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify({"status": "error", "message": "Not Found"}), 404


@app.errorhandler(405)
def handle_method_not_allowed(_error):
    return jsonify({"status": "error", "message": "Method Not Allowed"}), 405


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)
