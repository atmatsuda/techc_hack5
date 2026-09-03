# ai_service.py
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()

class TranslationResponse(BaseModel):
    translation_en: str = Field(description="入力テキストの英語訳")
    translation_ja: str = Field(description="入力テキストの日本語訳（自然な表現）")
    grammar_note: str = Field(description="使用されている重要な文法やポイントの解説")
    nuance_note: str = Field(description="ニュアンスや使用される場面・コンテキストの解説")

def generate_chat_response(user_text: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY が設定されていません。")

    client = genai.Client(api_key=api_key)

    system_instruction = (
        "あなたは優秀な英語・日本語の語学メンターです。"
        "ユーザーから入力された文章を分析し、英語訳、日本語訳、文法解説、ニュアンス解説を提供してください。"
    )

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=TranslationResponse,
                temperature=0.3,
            ),
        )

        result_data = json.loads(response.text)

        return {
            "status": "success",
            "data": result_data
        }

    except Exception as e:
        print(f"❌ Gemini API Error: {str(e)}")
        return {
            "status": "error",
            "message": "AI応答の生成中にエラーが発生しました。"
        }