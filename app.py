import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_service import generate_chat_response  # AIサービスモジュールの読み込み

# Flaskアプリのインスタンス作成 (これが @app.route より上に必要です)
app = Flask(__name__)
CORS(app)  # CORS対策


@app.route('/api/chat/send', methods=['POST'])
def send_chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Invalid JSON"}), 400

        # text または message の双方に対応
        user_message = data.get('text') or data.get('message', '')
        if not user_message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        raw_reply = generate_chat_response(user_message)

        # HTML側 (appendAICard) が期待するキー名に合わせてレスポンスを作成
        formatted_reply = {
            "translation_en": raw_reply.get("translation_en", user_message),
            "translation_ja": raw_reply.get("translation_ja", ""),
            "grammar_note": raw_reply.get("grammar_note", ""),
            "nuance_note": raw_reply.get("nuance_note", ""),
            # 他のJSモジュール互換用
            "en": raw_reply.get("translation_en", user_message),
            "ja": raw_reply.get("translation_ja", ""),
            "grammarNote": raw_reply.get("grammar_note", ""),
            "nuance": raw_reply.get("nuance_note", ""),
            "phraseMap": {}
        }

        return jsonify({
            "status": "success",
            "messageId": f"msg_{int(time.time())}",
            "reply": formatted_reply
        }), 200

    except Exception as e:
        app.logger.error(f"Error in send_chat: {str(e)}")
        return jsonify({"status": "error", "message": "An internal error occurred"}), 500


if __name__ == '__main__':
    # ローカル開発用サーバー起動 (port 5000)
    app.run(host='0.0.0.0', port=5000, debug=True)