import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    # セキュリティ上の理由からAPIキー自体は出力せず、成功メッセージのみ出力
    print("✅ Gemini API Keyの読み込みに成功しました")
else:
    print("❌ Gemini API Keyが設定されていません")