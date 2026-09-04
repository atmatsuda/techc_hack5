import uuid
from flask import Flask, jsonify, request
from ai_service import generate_chat_response  # AIサービスをインポート

app = Flask(__name__)


def validate_chat_request(data):
    if not data or not isinstance(data, dict):
        return False, "リクエストボディが不正です"
    if "text" not in data or not isinstance(data["text"], str):
        return False, "textフィールドは必須です"
    if "userId" not in data or not isinstance(data["userId"], str):
        return False, "userIdフィールドは必須です"
    return True, None


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

    # AIサービス（Gemini API）を呼び出して動的レスポンスを取得
    ai_reply = generate_chat_response(text)

    response_body = {
        "status": "success",
        "messageId": message_id,
        "reply": ai_reply,
    }

    return jsonify(response_body), 200


if __name__ == "__main__":
    app.run(port=5000, debug=True)