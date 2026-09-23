import os
import sys
import json
import traceback
from dotenv import load_dotenv; load_dotenv()
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class ChatResponse(BaseModel):
    translation_en: str = Field(description="英語表現")
    translation_ja: str = Field(description="日本語表現")
    grammar_note: str = Field(description="文法・単語の解説")
    nuance_note: str = Field(description="ニュアンスや使い方の補足")

def generate_chat_response(prompt: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    # 🔍 ここで読み込んだAPIキーをターミナルに出力して確認します
    print(f"DEBUG_API_KEY: [{api_key}]")

    if not api_key:
        sys.stderr.write("[AI Service Error] GEMINI_API_KEY is not set in .env\n")
        return {
            "translation_en": prompt,
            "translation_ja": "エラー: APIキーが設定されていません",
            "grammar_note": ".env ファイルに GEMINI_API_KEY を設定してください。",
            "nuance_note": "",
        }

    try:
        # クライアントの初期化
        client = genai.Client(api_key=api_key)

        system_instruction = (
            "あなたは優秀な英語学習アシスタントです。"
            "スラング、日常会話、単語、短文など、どんな入力に対しても必ず以下のJSON構造で返答を作成してください。\n"
            "1. translation_en: 入力に対応する自然な英語\n"
            "2. translation_ja: 入力に対応する自然な日本語訳\n"
            "3. grammar_note: 文法構文、略語の元の形、語源などの解説\n"
            "4. nuance_note: カジュアルさ、ニュアンス、使われる場面の解説"
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=ChatResponse,
                temperature=0.7,
            ),
        )

        if response.parsed:
            if isinstance(response.parsed, ChatResponse):
                return response.parsed.model_dump()
            elif hasattr(response.parsed, "model_dump"):
                return response.parsed.model_dump()
            elif isinstance(response.parsed, dict):
                return response.parsed

        if response.text:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())

    except Exception as e:
        sys.stderr.write("="*50 + "\n")
        sys.stderr.write(f"[AI Service Exception] API Call Failed: {repr(e)}\n")
        traceback.print_exc(file=sys.stderr)
        sys.stderr.write("="*50 + "\n")

        return {
            "translation_en": prompt,
            "translation_ja": "エラーが発生しました",
            "grammar_note": f"API呼び出しエラー: {type(e).__name__}",
            "nuance_note": f"詳細: {str(e)}",
        }

    return {
        "translation_en": prompt,
        "translation_ja": "レスポンス取得失敗",
        "grammar_note": "AIからの応答構造化に失敗しました。",
        "nuance_note": "",
    }