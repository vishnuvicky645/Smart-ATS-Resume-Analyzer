import re
from collections import OrderedDict
from typing import Optional

import pdfplumber
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "ATS Analyzer Running"}


STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "our",
    "role",
    "team",
    "that",
    "the",
    "their",
    "to",
    "will",
    "with",
    "you",
    "your",
    "work",
    "job",
    "description",
    "responsibilities",
    "requirements",
    "experience",
    "skills",
}

ROLE_KEYWORDS = {
    "machine learning engineer": [
        "machine learning",
        "ml",
        "python",
        "scikit-learn",
        "tensorflow",
        "pytorch",
        "deep learning",
        "feature engineering",
        "model training",
        "model deployment",
        "statistics",
        "numpy",
        "pandas",
    ],
    "ai engineer": [
        "artificial intelligence",
        "machine learning",
        "deep learning",
        "nlp",
        "llm",
        "prompt engineering",
        "python",
        "pytorch",
        "tensorflow",
    ],
    "data analyst": [
        "sql",
        "excel",
        "power bi",
        "tableau",
        "python",
        "pandas",
        "data visualization",
        "reporting",
        "dashboard",
        "statistics",
    ],
    "data scientist": [
        "python",
        "machine learning",
        "statistics",
        "data analysis",
        "modeling",
        "pandas",
        "numpy",
        "scikit-learn",
        "sql",
    ],
    "frontend developer": [
        "react",
        "javascript",
        "typescript",
        "html",
        "css",
        "tailwind",
        "responsive design",
        "rest api",
        "redux",
    ],
    "backend developer": [
        "python",
        "fastapi",
        "django",
        "apis",
        "sql",
        "database",
        "docker",
        "authentication",
        "rest api",
    ],
    "full stack developer": [
        "react",
        "javascript",
        "python",
        "fastapi",
        "django",
        "sql",
        "html",
        "css",
        "rest api",
    ],
}

GENERIC_SKILLS = [
    "python",
    "java",
    "sql",
    "react",
    "javascript",
    "typescript",
    "fastapi",
    "django",
    "numpy",
    "pandas",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "excel",
    "power bi",
    "tableau",
    "aws",
    "docker",
    "git",
    "machine learning",
    "deep learning",
    "nlp",
    "data analysis",
    "data visualization",
    "model deployment",
    "feature engineering",
]


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9#+.\-/ ]", " ", text.lower())).strip()


def extract_weighted_terms(text: str) -> OrderedDict[str, int]:
    normalized = normalize_text(text)
    weighted_terms: OrderedDict[str, int] = OrderedDict()
    blocked_tokens: set[str] = set()

    combined_terms = sorted({*GENERIC_SKILLS, *sum(ROLE_KEYWORDS.values(), [])}, key=len, reverse=True)
    for term in combined_terms:
        if term in normalized:
            weighted_terms.setdefault(term, 3 if " " in term else 2 if len(term) > 6 else 1)
            if " " in term:
                blocked_tokens.update(term.split())

    for token in normalized.split():
        token = token.strip(".-_/+#")
        if not token or token in STOP_WORDS or token in blocked_tokens or len(token) < 3:
            continue
        weighted_terms.setdefault(token, 1)

    return weighted_terms


def detect_role(job_description: str) -> str:
    normalized = normalize_text(job_description)

    for role_name, keywords in ROLE_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return role_name

    return "general"


def build_suggestions(missing_terms: list[str], role: str) -> list[str]:
    suggestions = [
        f"Add {term.title()} evidence, projects, or metrics to your resume."
        for term in missing_terms[:5]
    ]

    role_specific = {
        "machine learning engineer": "Highlight model training, evaluation, deployment, and measurable ML outcomes.",
        "ai engineer": "Show AI, NLP, or LLM projects with clear technical impact and deployment details.",
        "data analyst": "Emphasize dashboards, SQL reporting, business insights, and visualization tools.",
        "data scientist": "Include experimentation, modeling, feature engineering, and statistical analysis.",
        "frontend developer": "Show component-based UI work, responsive design, and API integration projects.",
        "backend developer": "Highlight APIs, authentication, databases, and scalable service design.",
        "full stack developer": "Balance frontend and backend proof with end-to-end project delivery.",
    }

    if role in role_specific:
        suggestions.append(role_specific[role])

    if not suggestions:
        suggestions = ["Your resume already matches the key job keywords we checked."]

    return suggestions


def extract_docx_text(file_bytes: bytes) -> str:
    import zipfile
    import xml.etree.ElementTree as ET
    from io import BytesIO
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in root.findall('.//w:p', ns):
                p_text = []
                for t in p.findall('.//w:t', ns):
                    if t.text:
                        p_text.append(t.text)
                if p_text:
                    paragraphs.append("".join(p_text))
            return "\n".join(paragraphs)
    except Exception:
        return ""


def audit_resume(text: str) -> dict:
    import re
    text_lower = text.lower()
    
    # 1. Contact Info Detection
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    has_email = email_match is not None
    email = email_match.group(0) if has_email else ""
    
    phone_match = re.search(r"(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}", text)
    has_phone = phone_match is not None
    phone = phone_match.group(0) if has_phone else ""
    
    has_linkedin = "linkedin.com/in/" in text_lower or re.search(r"linkedin\.com/in/[\w\-]+", text_lower) is not None
    has_github = "github.com/" in text_lower or re.search(r"github\.com/[\w\-]+", text_lower) is not None

    # 2. Critical Section Audits
    has_experience = any(hdr in text_lower for hdr in ["experience", "work history", "employment", "professional history", "career history"])
    has_education = any(hdr in text_lower for hdr in ["education", "academic", "university", "college", "degree", "qualification"])
    has_projects = any(hdr in text_lower for hdr in ["projects", "personal projects", "academic projects", "key projects"])
    has_skills = any(hdr in text_lower for hdr in ["skills", "technical skills", "core competencies", "technologies", "tools"])

    # 3. Word Count Verification
    words = [w for w in re.findall(r"\b\w+\b", text_lower) if len(w) > 1]
    word_count = len(words)
    if word_count < 300:
        word_count_status = "too_short"
    elif word_count > 1000:
        word_count_status = "too_long"
    else:
        word_count_status = "good"

    # 4. Action Verbs Evaluation
    action_verbs_list = {
        "led", "delivered", "engineered", "optimized", "automated", "created", "designed", 
        "implemented", "managed", "coordinated", "solved", "built", "programmed", "developed", 
        "architected", "increased", "decreased", "improved", "reduced", "spearheaded", "executed",
        "formulated", "established", "analyzed", "facilitated", "supervised", "directed", "initiated"
    }
    found_verbs = [word for word in words if word in action_verbs_list]
    action_verbs_count = len(found_verbs)
    action_verbs_found = list(set(found_verbs))[:10]

    # 5. Quantifiable Achievements check
    metrics_matches = re.findall(r"(\d+%\s*|\$\s*\d+|\b\d+\s*(?:percent|million|billion|k|users|customers|servers|employees|team members|hours|days|weeks|months|years|x|fold)\b)", text_lower)
    quantified_metrics_count = len(metrics_matches)
    quantified_metrics_found = list(set(metrics_matches))[:10]

    return {
        "has_email": has_email,
        "email": email,
        "has_phone": has_phone,
        "phone": phone,
        "has_linkedin": has_linkedin,
        "has_github": has_github,
        "has_experience": has_experience,
        "has_education": has_education,
        "has_projects": has_projects,
        "has_skills": has_skills,
        "word_count": word_count,
        "word_count_status": word_count_status,
        "action_verbs_count": action_verbs_count,
        "action_verbs_found": action_verbs_found,
        "quantified_metrics_count": quantified_metrics_count,
        "quantified_metrics_found": quantified_metrics_found
    }


def analyze_resume_text(resume_text: str, job_description: str) -> dict[str, object]:
    role = detect_role(job_description or resume_text)
    resume_terms = extract_weighted_terms(resume_text)
    jd_terms = extract_weighted_terms(job_description or resume_text)

    matched_terms = [term for term in jd_terms if term in resume_terms]
    missing_terms = [term for term in jd_terms if term not in resume_terms]

    total_weight = sum(jd_terms.values()) or 1
    matched_weight = sum(jd_terms[term] for term in matched_terms)
    score = round((matched_weight / total_weight) * 100, 1)

    skill_matches = [term for term in matched_terms if term in GENERIC_SKILLS or term in resume_terms]
    highlights = list(OrderedDict.fromkeys(skill_matches))[:10]

    suggestions = build_suggestions(missing_terms, role)
    checklist = audit_resume(resume_text)

    return {
        "detected_role": role,
        "skills_found": highlights,
        "ats_score": score,
        "match_percentage": score,
        "coverage_percentage": round((len(matched_terms) / max(len(jd_terms), 1)) * 100, 1),
        "missing_skills": missing_terms[:10],
        "suggestions": suggestions,
        "matched_keywords": matched_terms[:10],
        "total_keywords": list(jd_terms.keys())[:20],
        "checklist": checklist
    }


@app.post("/upload")
async def upload_resume(file: UploadFile = File(...), jd: Optional[str] = Form(None)):
    text = ""
    filename_lower = file.filename.lower()
    raw_bytes = await file.read()

    try:
        if filename_lower.endswith(".pdf"):
            from io import BytesIO
            with pdfplumber.open(BytesIO(raw_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
        elif filename_lower.endswith(".docx"):
            text = extract_docx_text(raw_bytes)
        
        # Fallback to plain text if extraction yielded nothing or file format is unknown
        if not text:
            try:
                text = raw_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text = str(raw_bytes)
    except Exception as e:
        text = f"Error reading file contents: {str(e)}"

    analysis = analyze_resume_text(text, jd or "")

    return {
        "filename": file.filename,
        "resume_text": text,
        "detected_role": analysis["detected_role"],
        "skills_found": analysis["skills_found"],
        "ATS Score": analysis["ats_score"],
        "ats_score": analysis["ats_score"],
        "match_percentage": analysis["match_percentage"],
        "coverage_percentage": analysis["coverage_percentage"],
        "missing_skills": analysis["missing_skills"],
        "suggestions": analysis["suggestions"],
        "matched_keywords": analysis["matched_keywords"],
        "total_keywords": analysis["total_keywords"],
        "checklist": analysis["checklist"]
    }
