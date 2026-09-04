import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

# .envの読み込み
load_dotenv()

# Pydanticモデルの定義
class ChatResponse(BaseModel):
    translation_en: str
    translation_ja: str
    grammar_note: str
    nuance_note: str

def generate_chat_response(prompt: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        sys.stderr.write("[AI Service Error] GEMINI_API_KEY is not set.\n")
        return {
            "translation_en": prompt,
            "translation_ja": "翻訳を取得できませんでした",
            "grammar_note": "解説を取得できませんでした",
            "nuance_note": "",
        }

    try:
        client = genai.Client(api_key=api_key)
        
        system_instruction = (
            "あなたは優秀な英語学習アシスタントです。"
            "ユーザーから入力されたテキストに対して、英語翻訳、日本語翻訳、文法解説、ニュアンス解説を生成してください。"
        )

        # モデル名を gemini-3.6-flash に変更
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=ChatResponse,
                temperature=0.7,
            ),
        )

        if response.parsed:
            if hasattr(response.parsed, "model_dump"):
                return response.parsed.model_dump()
            return response.parsed.dict()
        else:
            sys.stderr.write("[AI Service Error] Response parsing failed.\n")
            return {
                "translation_en": prompt,
                "translation_ja": "翻訳を取得できませんでした",
                "grammar_note": "解説を取得できませんでした",
                "nuance_note": "",
            }

    except Exception as e:
        err_type = type(e).__name__
        err_detail = repr(e)
        sys.stderr.write(f"[AI Service Exception] {err_type}: {err_detail}\n")
        
        return {
            "translation_en": prompt,
            "translation_ja": "翻訳を取得できませんでした",
            "grammar_note": "解説を取得できませんでした",
            "nuance_note": "",
        }