import os
import time
import json
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

model = genai.GenerativeModel("gemini-2.5-flash")


# 🔥 CLEAN FUNCTION
def clean_ai_response(text: str):
    if not text:
        return ""

    text = text.replace("```json", "")
    text = text.replace("```", "")
    return text.strip()


# 🔥 MAIN GEMINI CALL
def generate_task_breakdown(project_name):
    prompt = f"""
You are a senior software project planner.

Break the project into structured JSON.

Project:
{project_name}

Return ONLY JSON:
{{
  "project_type": "",
  "epics": [
    {{
      "name": "",
      "tasks": [""]
    }}
  ]
}}
"""

    try:
        response = model.generate_content(prompt)
        cleaned = clean_ai_response(response.text)
        return cleaned

    except ResourceExhausted:
        print("⚠️ Gemini quota exceeded")
        return None

    except Exception as e:
        print("⚠️ Gemini error:", e)
        return None


# 🔥 RETRY SYSTEM
def generate_task_breakdown_with_retry(project_name, retries=2):

    for attempt in range(retries):
        try:
            response = generate_task_breakdown(project_name)

            if response:
                return response

        except Exception as e:
            print(f"⚠️ Retry {attempt+1} failed:", e)
            time.sleep(1)

    return None