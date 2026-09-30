import json
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()


def generate_chat_response(prompt: str) -> dict:
    """ユーザーのテキスト入力を受け取り、Gemini APIを使用して解説・翻訳レスポンスを生成する"""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # 内部ログ用の抽象的な例外
            raise RuntimeError("GEMINI_API_KEY_MISSING")

        client = genai.Client(api_key=api_key)

        system_instruction = (
            "You are an AI language learning assistant. "
            "Always respond in valid JSON format with no markdown formatting. "
            "Required keys: 'translation_en', 'translation_ja', 'grammar_note', 'nuance_note'. "
            "All explanations (grammar_note, nuance_note) must be in Japanese."
        )

        user_content = f"Input: {prompt}\n\nReturn JSON response only:"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_content,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
            },
        )

        res_text = response.text.strip()

        # マークダウン装飾（```json ... ```）の除去
        if res_text.startswith("```"):
            lines = res_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            res_text = "\n".join(lines).strip()

        return json.loads(res_text)

    except Exception:
        # 詳細なエラー情報（スタックトレースや生のエラー文言）を画面/レスポンスに出力しない
        print("❌ AIサービスの処理中にエラーが発生しました")
        return {
            "translation_en": prompt,
            "translation_ja": "翻訳を取得できませんでした",
            "grammar_note": "解説を取得できませんでした",
            "nuance_note": "",
        }