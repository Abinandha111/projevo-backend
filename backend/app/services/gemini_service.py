import os
import time
import json
from dotenv import load_dotenv
from google import genai
from groq import Groq


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key)




# 🔥 CLEAN FUNCTION
def clean_ai_response(text: str):
    if not text:
        return ""

    text = text.replace("```json", "")
    text = text.replace("```", "")
    return text.strip()

def generate_task_breakdown_with_groq(project_name):
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
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        return clean_ai_response(
            response.choices[0].message.content
        )

    except Exception as e:
        print("⚠️ Groq fallback error:", e)
        return None

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

def generate_project_summary(project_data:dict):
    prompt=f"""
        you are an AI project progress analyst for NexTask.

        Analyze the following project information and write a concise,
        easy-to-understand project progress summary.

        Project information:
        {json.dumps(project_data, indent=2, default=str)}

        Instructions:
        - Summarize overall project progress.
        - Mention completed and pending tasks.
        - Highlight overdue tasks if any.
        - Suggest the next priority.
        - Use only the information provided.
        - Do not invent task details or progress.
        - Return a professional summary in plain text, not JSON.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text.rstrip() if response.text else None
    except Exception as e :
        print("gemini project summary error",e)
        return None


# 🔥 RETRY SYSTEM
def generate_task_breakdown_with_retry(project_name, retries=2):

    # 1. Try Gemini
    for attempt in range(retries):
        try:
            response = generate_task_breakdown(project_name)

            if response:
                return response

        except Exception as e:
            print(f"⚠️ Gemini retry {attempt + 1} failed:", e)
            time.sleep(1)

    # 2. Gemini failed → Try Groq fallback
    print("⚠️ Gemini unavailable. Trying Groq fallback...")

    groq_response = generate_task_breakdown_with_groq(project_name)

    if groq_response:
        print("✅ Groq fallback successful")
        return groq_response

    # 3. Both failed
    print("❌ Gemini and Groq failed")

    return None


# Generate tasks for one selected Epic
def generate_epic_tasks_with_retry(project_name, epic_name, requirements, retries=2):
    prompt = f"""
You are a senior software project planner for NexTask.

Project name:
{project_name}

Selected Epic:
{epic_name}

User requirements:
{requirements}

Your task:
- Generate tasks ONLY for the selected Epic.
- Follow the user's requirements carefully.
- Do not generate tasks for other Epics.
- If the user asks to keep existing tasks and add new ones, generate only the additional tasks requested.
- Make the tasks clear, practical, and non-duplicative.
- Return valid JSON only, without Markdown code fences.

Required JSON format:
{{
    "epic_name": "{epic_name}",
    "tasks": [
        "First task",
        "Second task"
    ]
}}
"""

    # Try Gemini first
    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            cleaned = clean_ai_response(response.text)

            if cleaned:
                # Validate that the response is valid JSON
                result = json.loads(cleaned)

                if isinstance(result, dict) and isinstance(result.get("tasks"), list):
                    normalized_tasks = []
                    for task in result["tasks"]:
                        if isinstance(task, str) and task.strip():
                            normalized_tasks.append(task.strip())
                        elif isinstance(task, dict) and task.get("title"):
                            normalized_tasks.append(str(task["title"]).strip())
                    if normalized_tasks:
                        return {"epic_name": epic_name, "tasks": normalized_tasks}

        except Exception as e:
            print(f"Gemini Epic generation attempt {attempt + 1} failed:", e)
            time.sleep(1)

    # Gemini failed: try Groq fallback
    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )

        cleaned = clean_ai_response(response.choices[0].message.content)
        result = json.loads(cleaned)

        if isinstance(result, dict) and isinstance(result.get("tasks"), list):
            normalized_tasks = []
            for task in result["tasks"]:
                if isinstance(task, str) and task.strip():
                    normalized_tasks.append(task.strip())
                elif isinstance(task, dict) and task.get("title"):
                    normalized_tasks.append(str(task["title"]).strip())
            if normalized_tasks:
                return {"epic_name": epic_name, "tasks": normalized_tasks}

    except Exception as e:
        print("Groq Epic generation fallback failed:", e)

    return None
