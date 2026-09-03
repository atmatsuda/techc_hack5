import os
from dotenv import load_dotenv

load_dotenv()

# GeminiのAPI Keyを取得
api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    # 先頭8文字のみ安全に表示
    print(f"✅ Gemini API Keyの読み込み成功: {api_key[:8]}...")
else:
    print("❌ GEMINI_API_KEY が設定されていません。.envファイルを確認してください。")