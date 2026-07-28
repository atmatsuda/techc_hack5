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
import socket
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# .env があれば読み込む（将来的な OPENAI_API_KEY 等の管理用。現時点では未使用）
load_dotenv()

# index.html / css / js を同一Flaskアプリから静的配信する。
# これにより各自のスマホは常に「今開いているページと同じオリジン」にfetchするだけで済み、
# 127.0.0.1決め打ちのようなLAN内で機能しないURLを書かずに済む。
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")

# 複数端末（同一Wi-Fi内の各自のスマホ）から異なるオリジンでアクセスされるため、
# 引き続きCORSは許可しておく。
CORS(app)


def get_lan_ip():
    """
    同一Wi-Fi内の他端末（参加者のスマホ等）からアクセス可能な、
    このPCのLAN内IPアドレスを取得する。

    実際にはどこにも接続せず、UDPソケットの宛先解決の副作用として
    OSがルーティングに使うローカル側IPを取得するテクニック。
    ネットワーク到達不可な環境（オフライン等）では127.0.0.1にフォールバックする。
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()

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


@app.route("/")
def index():
    """トップページ（index.html）を配信する。"""
    return app.send_static_file("index.html")


@app.route("/api/host-info", methods=["GET"])
def host_info():
    """
    QR表示ページ（qr.html）専用の補助API。

    通常時: このPCのLAN内IPとポートから、同一Wi-Fi内のスマホがアクセスすべきURLを組み立てて返す。
    会場にWi-Fiが無い/モバイル回線のみの場合: 環境変数 PUBLIC_URL に
    cloudflared 等のトンネルが発行した公開URL（例: https://xxxx.trycloudflare.com）を
    設定しておくと、LAN IPより優先してそちらを返す。これによりQRコードは
    インターネット経由でどこからでも（Wi-Fi不要・モバイル回線でも）読み取り可能になる。
    """
    public_url = os.environ.get("PUBLIC_URL", "").strip()
    if public_url:
        url = public_url if public_url.endswith("/") else public_url + "/"
        return jsonify({
            "status": "success",
            "lanUrl": url,
            "mode": "tunnel",
        })

    port = int(os.environ.get("PORT", 5000))
    lan_ip = get_lan_ip()
    return jsonify({
        "status": "success",
        "lanUrl": f"http://{lan_ip}:{port}/",
        "mode": "lan",
    })


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
    public_url = os.environ.get("PUBLIC_URL", "").strip()

    if public_url:
        print(f"\n[トンネル経由の公開URL（Wi-Fi不要・モバイル回線からもアクセス可）]\n"
              f"  {public_url}\n"
              f"  (QRコード表示ページはホストPC自身のブラウザで開いてください: "
              f"http://127.0.0.1:{port}/qr.html)\n")
    else:
        lan_ip = get_lan_ip()
        print(f"\n[同一Wi-Fi内のスマホからのアクセス用URL]\n  http://{lan_ip}:{port}/\n"
              f"  (QRコード表示ページ: http://{lan_ip}:{port}/qr.html)\n"
              f"  ※会場にWi-Fiが無い場合は PUBLIC_URL 環境変数にトンネルURLを設定してください\n")

    # host="0.0.0.0"：ループバックだけでなく同一LAN内の他端末からの接続も受け付ける。
    app.run(host="0.0.0.0", port=port, debug=True)