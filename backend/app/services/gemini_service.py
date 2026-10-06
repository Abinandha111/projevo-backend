import os
import time
import json
from dotenv import load_dotenv
from google import genai


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)




# 🔥 CLEAN FUNCTION
def clean_ai_response(text: str):
    if not text:
        return ""

    text = text.replace("```json", "")
    text = text.replace("```", "")
    return text.strip()


# 🔥 VALIDATE PROJECT IDEA
def validate_project_idea(title: str, description: str = None) -> dict:
    """
    Validates whether the provided project title and description represent
    a genuine, meaningful project idea using Gemini AI.
    Returns:
        {"valid": bool, "reason": str, "error": bool}
    """
    clean_title = (title or "").strip()
    clean_desc = (description or "").strip()

    if not clean_title:
        return {
            "valid": False,
            "reason": "Project title is required.",
            "error": False
        }

    prompt = f"""You are an AI project validator for NexTask, a project management platform for student and team projects.
Your task is to determine whether the submitted project title and description represent a genuine, meaningful, and plausible project idea (such as a software application, engineering project, research study, student assignment, business initiative, or creative project).

Evaluation Criteria:
1. Genuine Project Idea: The submission must represent a plausible, recognizable project, application, system, tool, or initiative.
2. Incoherent / Meaningless / Placeholder: REJECT if the input consists of greetings, random words, placeholder text (e.g., 'Test Project', 'Hello', 'Bye Bye', 'Too Too'), keyboard mash (e.g., 'asdfghjk'), or vague text that does not describe an actual project.
3. Reasonable Flexibility: Accept legitimate projects even if the description is brief, as long as the title/description clearly conveys a real project concept (e.g. 'Student Expense Tracker', 'Recruitment Management System', 'AI Chatbot for Customer Support').

Project Submission:
Title: {clean_title}
Description: {clean_desc if clean_desc else "No description provided"}

Return ONLY a valid JSON object in this exact format:
{{
  "is_valid": true,
  "reason": "A concise, professional explanation. If invalid, explain constructively why the submission is not a valid project idea."
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        cleaned = clean_ai_response(response.text)

        try:
            result = json.loads(cleaned)
        except Exception:
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}")
            if start_idx != -1 and end_idx != -1:
                result = json.loads(cleaned[start_idx:end_idx + 1])
            else:
                raise ValueError("Could not parse JSON from Gemini response")

        is_valid = bool(result.get("is_valid", False))
        reason = str(result.get("reason", "")).strip()
        if not reason:
            reason = (
                "Project idea validated successfully."
                if is_valid
                else "Project idea appears invalid or meaningless. Please provide a clear project title and description."
            )

        return {
            "valid": is_valid,
            "reason": reason,
            "error": False
        }

    except Exception as e:
        print("⚠️ Gemini project validation error:", e)
        return {
            "valid": False,
            "reason": "Project validation is currently unavailable. Please try again.",
            "error": True
        }



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
        response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
        cleaned = clean_ai_response(response.text)
        return cleaned

    

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