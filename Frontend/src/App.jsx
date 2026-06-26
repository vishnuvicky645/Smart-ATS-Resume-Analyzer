import { useMemo, useState, useEffect } from 'react'
import { analyzeResume } from './services/atsApi'

// Predefined JD Templates for ease of testing
const JD_TEMPLATES = {
  ai_engineer: `We are looking for an AI Engineer to join our core team. 
Requirements:
- Strong proficiency in Python, PyTorch or TensorFlow.
- Hands-on experience building and fine-tuning Large Language Models (LLMs) and Prompt Engineering.
- Familiarity with vector databases (Pinecone, Milvus), retrieval-augmented generation (RAG) architectures, and LangChain.
- Experience in deploying machine learning models to production using FastAPI and Docker.
- Solid understanding of NLP algorithms and deep learning architectures.`,

  frontend_developer: `We are seeking a Frontend Developer to build responsive user experiences.
Requirements:
- Deep expertise in React, JavaScript, and TypeScript.
- Proficient with Tailwind CSS, CSS Grid, Flexbox, and modern design systems.
- Experience with state management libraries like Redux Toolkit.
- Skilled in integrating REST APIs, performance optimization, and writing clean, reusable components.
- Understanding of responsive design, web accessibility (WCAG), and modern build tools like Vite.`,

  data_analyst: `We are hiring a Data Analyst to translate complex data into business insights.
Requirements:
- Advanced SQL query skills for database extraction and data manipulation.
- Proficiency in Python (Pandas, Numpy) for data cleaning and analysis.
- Experience building interactive dashboards and reports in Tableau or Power BI.
- Strong statistical background to perform trend analysis and reporting.
- Excel wizard with experience in pivot tables and data visualization.`
}

const initialResults = {
  atsScore: null,
  skillsFound: [],
  missingSkills: [],
  suggestions: [],
  detectedRole: 'general',
  matchedKeywords: [],
  totalKeywords: [],
  checklist: {
    has_email: false,
    email: '',
    has_phone: false,
    phone: '',
    has_linkedin: false,
    has_github: false,
    has_experience: false,
    has_education: false,
    has_projects: false,
    has_skills: false,
    word_count: 0,
    word_count_status: 'too_short',
    action_verbs_count: 0,
    action_verbs_found: [],
    quantified_metrics_count: 0,
    quantified_metrics_found: []
  }
}

// Icon Components (Inline SVG for clean, zero-dependency visual presentation)
function IconCheck({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconWarning({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function IconInfo({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.086.797l-.535 1.708a2.25 2.25 0 01-1.096 1.34L11.25 15.3M12 8.25h.008v.008H12V8.25zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconCopy({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 4.5m10.375 0A10.41 10.41 0 0112 18c-2.485 0-4.72-.867-6.475-2.304m13.725 9.554a9 9 0 00-13.725 0m0 0V8.25m0 0h4.5m5.25-5.25h3a1.125 1.125 0 011.125 1.125V21a1.125 1.125 0 01-1.125 1.125h-3a1.125 1.125 0 01-1.125-1.125V4.125c0-.621.504-1.125 1.125-1.125z" />
    </svg>
  )
}

function IconEdit({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function IconEye({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// Highlighted resume visualization component
function HighlightedResume({ text, matchedKeywords, missingKeywords }) {
  if (!text) return <p className="text-slate-400">No resume text analyzed yet.</p>

  const allKeywords = useMemo(() => {
    return [
      ...matchedKeywords.map((k) => ({ word: k, type: 'matched' })),
      ...missingKeywords.map((k) => ({ word: k, type: 'missing' }))
    ].sort((a, b) => b.word.length - a.word.length)
  }, [matchedKeywords, missingKeywords])

  if (allKeywords.length === 0) {
    return <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">{text}</pre>
  }

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  const regexPattern = useMemo(() => {
    return allKeywords.map((k) => {
      const esc = escapeRegExp(k.word)
      const startBoundary = /^[a-zA-Z0-9]/.test(k.word) ? '\\b' : ''
      const endBoundary = /[a-zA-Z0-9]$/.test(k.word) ? '\\b' : ''
      return `${startBoundary}${esc}${endBoundary}`
    }).join('|')
  }, [allKeywords])

  const renderedContent = useMemo(() => {
    try {
      const regex = new RegExp(`(${regexPattern})`, 'gi')
      const parts = text.split(regex)

      return parts.map((part, index) => {
        const partLower = part.toLowerCase()
        const match = allKeywords.find((k) => k.word.toLowerCase() === partLower)
        
        if (match) {
          if (match.type === 'matched') {
            return (
              <mark 
                key={index} 
                className="mx-0.5 rounded bg-emerald-500/20 px-1 font-semibold text-emerald-300 border border-emerald-500/30"
              >
                {part}
              </mark>
            )
          } else {
            return (
              <mark 
                key={index} 
                className="mx-0.5 rounded bg-amber-500/20 px-1 font-semibold text-amber-300 border border-amber-500/30"
              >
                {part}
              </mark>
            )
          }
        }
        return part
      })
    } catch (e) {
      return text
    }
  }, [text, regexPattern, allKeywords])

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed max-h-[550px] overflow-y-auto pr-2 bg-slate-950/80 p-5 rounded-[1.5rem] border border-white/5">
      {renderedContent}
    </pre>
  )
}

function Pill({ children, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'border-white/10 bg-white/5 text-slate-200',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

function Card({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-xl shadow-slate-950/30 backdrop-blur-xl ${className}`}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function MetricBar({ label, value, accent = 'cyan', suffix = '%' }) {
  const accents = {
    cyan: 'from-cyan-400 to-emerald-400',
    emerald: 'from-emerald-400 to-cyan-300',
    amber: 'from-amber-400 to-orange-300',
    rose: 'from-rose-400 to-pink-300',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-medium text-white">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accents[accent]}`}
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [results, setResults] = useState(initialResults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  // Advanced Interactive States
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'workspace', 'keywords', 'tailor', 'coverletter', 'interview'
  const [workspaceMode, setWorkspaceMode] = useState('preview') // 'preview', 'edit'
  const [editedResumeText, setEditedResumeText] = useState('')
  const [keywordSearch, setKeywordSearch] = useState('')

  // Gemini Tailoring State
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiLoading, setAiLoading] = useState({ bullets: false, cover: false, interview: false })
  const [aiOutputs, setAiOutputs] = useState({
    bullets: '',
    cover: '',
    interview: ''
  })
  const [aiError, setAiError] = useState('')
  const [backendOnline, setBackendOnline] = useState(null) // null = checking, true = online, false = offline

  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey)
  }, [geminiApiKey])

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch('http://127.0.0.1:8000/')
        if (response.ok) {
          setBackendOnline(true)
        } else {
          setBackendOnline(false)
        }
      } catch (e) {
        setBackendOnline(false)
      }
    }
    checkBackend()
    const interval = setInterval(checkBackend, 10000)
    return () => clearInterval(interval)
  }, [])

  const scoreValue = Number(results.atsScore)
  const score = Number.isFinite(scoreValue) ? scoreValue : 0
  const matchedCount = results.matchedKeywords.length
  const totalCount = results.totalKeywords.length || results.missingSkills.length + matchedCount
  const coverage = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0
  const keywordBreadth = Math.min(100, Math.round((results.skillsFound.length / Math.max(6, totalCount || 1)) * 100))
  const resumeFit = Math.min(100, Math.round((score * 0.6) + (coverage * 0.4)))

  const fileLabel = useMemo(() => {
    if (!selectedFile) return 'No resume selected yet'
    return `${selectedFile.name} • ${(selectedFile.size / 1024).toFixed(0)} KB`
  }, [selectedFile])

  async function handleAnalyze() {
    if (!selectedFile && !editedResumeText) {
      setError('Please upload a resume file or type resume text in the workspace first.')
      return
    }

    if (!jobDescription.trim()) {
      setError('Please add the job description before analyzing.')
      return
    }

    try {
      setLoading(true)
      setError('')

      let fileToUpload = selectedFile
      // If user has edited resume in the workspace, we generate a text file blob and upload it
      if (editedResumeText && workspaceMode === 'edit') {
        fileToUpload = new File([editedResumeText], selectedFile?.name || 'resume_edited.txt', {
          type: 'text/plain',
        })
      }

      const data = await analyzeResume(fileToUpload, jobDescription)
      const missingSkills = data.missing_skills ?? []
      const apiSuggestions = data.suggestions ?? []

      setResults({
        atsScore: data.ats_score ?? data.match_percentage ?? data['ATS Score'] ?? data.atsScore ?? null,
        skillsFound: data.skills_found ?? data.skillsFound ?? [],
        missingSkills,
        suggestions:
          apiSuggestions.length > 0
            ? apiSuggestions
            : missingSkills.map((skill) => `Add {skill} projects or examples to strengthen your resume.`),
        detectedRole: data.detected_role ?? data.detectedRole ?? 'general',
        matchedKeywords: data.matched_keywords ?? data.matchedKeywords ?? data.skills_found ?? data.skillsFound ?? [],
        totalKeywords: data.total_keywords ?? data.totalKeywords ?? [],
        checklist: data.checklist ?? initialResults.checklist
      })

      if (!editedResumeText) {
        setEditedResumeText(data.resume_text || '')
      }
      setHasAnalyzed(true)
      // Switch back to preview workspace or dashboard
      if (workspaceMode === 'edit') {
        setWorkspaceMode('preview')
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          'Failed to analyze resume. Make sure FastAPI is running on port 8000.',
      )
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill JDs from templates
  function applyTemplate(key) {
    if (JD_TEMPLATES[key]) {
      setJobDescription(JD_TEMPLATES[key])
    }
  }

  // Call Gemini API directly from browser for tailoring tools
  async function runGeminiAction(actionType, promptText) {
    if (!geminiApiKey) {
      setAiError('Please enter your Gemini API Key first.')
      return
    }

    setAiError('')
    setAiLoading(prev => ({ ...prev, [actionType]: true }))

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText
                  }
                ]
              }
            ]
          })
        }
      )

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson?.error?.message || `HTTP error ${response.status}`)
      }

      const resData = await response.json()
      const generatedText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.'
      
      setAiOutputs(prev => ({ ...prev, [actionType]: generatedText }))
    } catch (e) {
      setAiError(`AI Tailoring Failed: ${e.message}`)
    } finally {
      setAiLoading(prev => ({ ...prev, [actionType]: false }))
    }
  }

  function handleOptimizeBullets() {
    const prompt = `You are an expert ATS optimization coach. Here is the candidate's resume text:
---
${editedResumeText || 'No resume text provided.'}
---
And here is the Job Description they are targeting:
---
${jobDescription}
---
The candidate's resume is missing these key skills requested by the job description: ${results.missingSkills.join(', ') || 'N/A'}.
Identify the most critical experiences in the resume. Rewrite 4-5 high-impact bullet points for their experience section that naturally integrate these missing keywords. Each bullet point MUST start with a strong action verb (like spearheaded, designed, engineered, optimized, automated) and include a quantifiable result (metrics, percentage increase, dollars saved, scale of system) to prove achievements. Provide explanations of why these changes help pass ATS. Format the output in clean markdown.`

    runGeminiAction('bullets', prompt)
  }

  function handleGenerateCoverLetter() {
    const prompt = `You are a professional career consultant. Write a highly tailored, compelling, and professional Cover Letter (about 300 words) for the candidate applying to this job.
Resume Text:
---
${editedResumeText || 'No resume text provided.'}
---
Job Description:
---
${jobDescription}
---
Ensure the letter includes a professional greeting, references the target position, highlights the candidate's matched skills (${results.matchedKeywords.slice(0, 5).join(', ') || 'general experience'}), addresses how they can bridge their missing skills, and explains why they are a perfect fit. Deliver a clean cover letter ready to copy, formatted in markdown.`

    runGeminiAction('cover', prompt)
  }

  function handleGenerateInterview() {
    const prompt = `You are a technical recruiter. Analyze this resume text and the job description:
Resume:
---
${editedResumeText || 'No resume text provided.'}
---
Job Description:
---
${jobDescription}
---
Generate exactly 5 custom interview questions tailored for the candidate to help them prepare:
- 3 technical questions based on the core skills in the job description, especially highlighting areas where the resume is missing key keywords (${results.missingSkills.slice(0, 5).join(', ') || 'advanced concepts'}).
- 2 behavioral questions based on standard hiring frameworks (STAR method).
For each question, provide:
1. Detailed reasoning on what the interviewer is looking for.
2. A step-by-step guidance on how to construct the answer.
3. A sample high-scoring response tailored to their profile.
Format in clean, readable markdown.`

    runGeminiAction('interview', prompt)
  }

  // Copy to clipboard helper
  function copyTextToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    }
  }

  // Word count evaluation UI text
  const wordCountRating = {
    good: { text: 'Optimal length (400-800 words)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    too_short: { text: 'Too short (Under 300 words - add detail)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    too_long: { text: 'Too long (Over 1000 words - condense content)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  }[results.checklist?.word_count_status || 'too_short']

  // Keywords filter
  const filteredMissing = results.missingSkills.filter(skill => 
    skill.toLowerCase().includes(keywordSearch.toLowerCase())
  )
  const filteredMatched = results.matchedKeywords.filter(skill => 
    skill.toLowerCase().includes(keywordSearch.toLowerCase())
  )

  return (
    <div className="relative min-h-screen bg-[#050816] text-slate-100 flex flex-col font-sans">
      {/* Dynamic Modern Radial Backgrounds */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_40%)]" />

      {/* Top Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-emerald-400 text-slate-950 font-bold text-lg shadow-md shadow-cyan-500/20">
              A
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent sm:text-base">
                Smart ATS Resume Analyzer
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-400">Career Acceleration Platform</p>
                <span className="text-[10px] text-slate-500">•</span>
                {backendOnline === null ? (
                  <span className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                    Checking Backend...
                  </span>
                ) : backendOnline ? (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 relative inline-block"></span>
                    Backend Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] text-rose-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 relative inline-block animate-pulse"></span>
                    Backend Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Gemini API Key Toggle Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  geminiApiKey
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                {geminiApiKey ? 'AI Optimization Active' : 'Configure Gemini AI'}
              </button>

              {showApiKey && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl z-50">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Gemini API Key</h4>
                  <p className="text-[10px] text-slate-400 mb-3">Stored locally inside your browser cache.</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400/40"
                    />
                    {geminiApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setGeminiApiKey('')
                          setAiOutputs({ bullets: '', cover: '', interview: '' })
                        }}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 px-2.5 text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      Get Free API Key →
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative flex-grow mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
          
          {/* Left Column: Control Panel */}
          <aside className="flex flex-col gap-6">
            <Card 
              title="Requirements Control Panel" 
              subtitle="Upload resume & set job targets"
              className="border-white/5 bg-slate-950/60 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="space-y-4">
                {/* File Upload Area */}
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/20 bg-cyan-400/5 px-4 py-5 text-center transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-7 w-7 text-cyan-400 mb-1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Click or drag resume file</span>
                  <span className="mt-0.5 text-[10px] text-slate-400">PDF, DOCX, or TXT formats</span>
                  <span className="mt-2 inline-block rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-cyan-300 font-medium font-mono truncate max-w-[280px]">
                    {fileLabel}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </label>

                {/* Template Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">
                    Pre-fill job description template
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('ai_engineer')}
                      className="rounded-lg border border-white/5 bg-white/5 py-1.5 text-[10px] text-slate-300 hover:bg-cyan-400/10 hover:border-cyan-400/20 hover:text-cyan-200 transition text-center"
                    >
                      AI Engineer
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('frontend_developer')}
                      className="rounded-lg border border-white/5 bg-white/5 py-1.5 text-[10px] text-slate-300 hover:bg-cyan-400/10 hover:border-cyan-400/20 hover:text-cyan-200 transition text-center"
                    >
                      Frontend Dev
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('data_analyst')}
                      className="rounded-lg border border-white/5 bg-white/5 py-1.5 text-[10px] text-slate-300 hover:bg-cyan-400/10 hover:border-cyan-400/20 hover:text-cyan-200 transition text-center"
                    >
                      Data Analyst
                    </button>
                  </div>
                </div>

                {/* Job Description Textarea */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="job-description" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">
                      Target Job Description
                    </label>
                    <span className="text-[9px] text-slate-500">{jobDescription.length} chars</span>
                  </div>
                  <textarea
                    id="job-description"
                    rows="6"
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste the requirements of the role you are targeting..."
                    className="w-full rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/10 leading-relaxed resize-y"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
                    {error}
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : hasAnalyzed ? (
                    '⚡ Re-Analyze Resume'
                  ) : (
                    '🚀 Analyze Resume & Score'
                  )}
                </button>
              </div>
            </Card>

            {/* Quick Metrics Bar in Left Sidebar if Analyzed */}
            {hasAnalyzed && (
              <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Match score</p>
                  <p className={`mt-1 text-xl font-extrabold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {score}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Missing Skills</p>
                  <p className="mt-1 text-xl font-extrabold text-amber-400">{results.missingSkills.length}</p>
                </div>
              </div>
            )}
          </aside>

          {/* Right Column: Dynamic Workspace */}
          <div className="flex flex-col gap-6 h-full">
            {!hasAnalyzed ? (
              <div className="flex-grow flex flex-col gap-6 justify-center py-8">
                <div className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-8 shadow-xl backdrop-blur-xl space-y-8 max-w-3xl mx-auto">
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">ATS Analysis Workspace</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Optimize your resume to pass automated screens. Upload a resume on the left and specify a target job requirements template to launch the real-time scoring.
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-2">
                      <div className="h-8 w-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 font-bold text-sm">1</div>
                      <h4 className="text-xs font-semibold text-white">Parser Audit</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Checks formatting headers, contact numbers, email patterns, links, and sections.</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
                      <h4 className="text-xs font-semibold text-white">Keyword Fit</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Extracts relevant professional keywords and identifies gaps in your experience text.</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-2">
                      <div className="h-8 w-8 rounded-lg bg-purple-400/10 flex items-center justify-center text-purple-400 font-bold text-sm">3</div>
                      <h4 className="text-xs font-semibold text-white">AI Copilot</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Optionally rewrites resume bullets, generates target cover letters, and builds Q&A sheets.</p>
                    </div>
                  </div>

                  {/* Privacy Alert */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/20 p-4 flex items-start gap-3">
                    <span className="text-cyan-400 mt-0.5"><IconInfo className="h-4 w-4" /></span>
                    <div>
                      <p className="text-xs font-semibold text-white">Privacy and Safety First</p>
                      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                        Your data stays local. If you configure a Gemini API key, requests are sent directly to Google APIs from your browser. Your key is stored locally in your browser's private local storage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                {/* Tabs Header */}
                <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
                  {[
                    { id: 'dashboard', label: '📊 Score Dashboard' },
                    { id: 'workspace', label: '📝 Live Workspace Editor' },
                    { id: 'keywords', label: '🔑 Skill Keywords' },
                    { id: 'tailor', label: '🚀 AI Bullet Optimizations' },
                    { id: 'coverletter', label: '✉️ AI Cover Letter' },
                    { id: 'interview', label: '🎯 AI Interview Prep' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold border transition ${
                        activeTab === tab.id
                          ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200 shadow-sm'
                          : 'border-transparent bg-white/5 text-slate-400 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

            {/* Tab Contents */}
            
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                {/* Score Dial & Detailed metrics */}
                <div className="space-y-6">
                  <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-slate-950/70 to-white/5 p-6 shadow-2xl backdrop-blur-xl">
                    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center">
                      <div>
                        <Pill tone={score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'rose'}>
                          ATS Assessment
                        </Pill>
                        <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                          Candidate ATS Rating: {score.toFixed(1)}%
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          This score checks the semantic representation of your profile compared to the job description keywords. Re-upload or edit below to improve.
                        </p>

                        <div className="mt-6 space-y-4">
                          <MetricBar label="Role Fit Keyword Coverage" value={coverage} accent="emerald" />
                          <MetricBar label="Overall Resume Fit" value={resumeFit} accent="cyan" />
                          <MetricBar label="JD Keyword Breadth" value={keywordBreadth} accent="amber" />
                        </div>
                      </div>

                      {/* Circular Gauge */}
                      <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/10 via-emerald-400/5 to-transparent blur-xl" />
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(${
                              score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e'
                            } ${score}%, rgba(255, 255, 255, 0.05) 0)`
                          }}
                        />
                        <div className="relative flex h-[184px] w-[184px] items-center justify-center rounded-full border border-white/10 bg-slate-950/95 shadow-inner">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Match score</p>
                            <p className="mt-2 text-4xl font-extrabold text-white">{score}%</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {matchedCount} / {totalCount} keywords matched
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Audit details grid */}
                  <div className="grid gap-6 sm:grid-cols-3">
                    <Card title="Word Count Density" subtitle="Optimal ATS size checklist">
                      <div className={`rounded-xl border p-4 text-center ${wordCountRating.color}`}>
                        <p className="text-xs font-semibold">Word Count</p>
                        <p className="mt-1 text-2xl font-bold">{results.checklist?.word_count || 0}</p>
                        <p className="mt-2 text-[10px] leading-tight">{wordCountRating.text}</p>
                      </div>
                    </Card>

                    <Card title="Strong Action Verbs" subtitle="Proving leadership & action">
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                        <p className="text-xs font-semibold text-slate-400">Action Verbs Found</p>
                        <p className="mt-1 text-2xl font-bold text-cyan-300">{results.checklist?.action_verbs_count || 0}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                          {(results.checklist?.action_verbs_found || []).slice(0, 3).map((verb) => (
                            <span key={verb} className="rounded bg-cyan-400/10 px-1 py-0.5 text-[9px] text-cyan-300">
                              {verb}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <Card title="Data-Driven Metrics" subtitle="Result-oriented proof points">
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                        <p className="text-xs font-semibold text-slate-400">Quantifiable Metrics</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-300">{results.checklist?.quantified_metrics_count || 0}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                          {(results.checklist?.quantified_metrics_found || []).slice(0, 2).map((metric, i) => (
                            <span key={i} className="rounded bg-emerald-400/10 px-1 py-0.5 text-[9px] text-emerald-300 max-w-[80px] truncate">
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Audit checklist card */}
                <div>
                  <Card 
                    title="ATS Quality Checklist Audit" 
                    subtitle="Diagnostic summary check of contact info and major headers."
                  >
                    <div className="space-y-3">
                      {[
                        { label: 'Email Contact Address', value: results.checklist?.has_email, note: results.checklist?.email || 'Missing email contact info' },
                        { label: 'Phone Contact Number', value: results.checklist?.has_phone, note: results.checklist?.phone || 'Missing phone number' },
                        { label: 'LinkedIn Profile Link', value: results.checklist?.has_linkedin, note: 'Provides social verification proof' },
                        { label: 'GitHub / Portfolio Link', value: results.checklist?.has_github, note: 'Highlights hands-on projects code' },
                        { label: 'Experience History Section', value: results.checklist?.has_experience, note: 'Chronological roles list' },
                        { label: 'Education Credentials Section', value: results.checklist?.has_education, note: 'Accreditation background' },
                        { label: 'Projects Showcase Section', value: results.checklist?.has_projects, note: 'Technical experience highlights' },
                        { label: 'Structured Skillset List', value: results.checklist?.has_skills, note: 'Core technical competencies' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs font-medium text-white">{item.label}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{item.note}</p>
                          </div>
                          <div>
                            {item.value ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                <IconCheck className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/15 text-rose-400" title="Missing element on resume">
                                <IconWarning className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: WORKSPACE EDITOR */}
            {activeTab === 'workspace' && (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                {/* Left Panel: Read Job Description requirements */}
                <div className="space-y-4">
                  <Card title="Target Job Requirements" subtitle="Active job description keyword source.">
                    <pre className="whitespace-pre-wrap rounded-xl border border-white/5 bg-slate-900/65 p-4 font-sans text-xs text-slate-300 max-h-[350px] overflow-y-auto leading-relaxed">
                      {jobDescription}
                    </pre>
                  </Card>
                  
                  <Card title="Score Improvement Guidelines" subtitle="Tips to increase the rating matching this role.">
                    <ul className="list-disc pl-4 space-y-2 text-xs text-slate-400">
                      <li>Scan the highlighted resume on the right.</li>
                      <li>Look for <span className="text-amber-300 font-semibold bg-amber-500/10 px-1 rounded">Amber Keywords</span> which indicate terms present in the job requirements but missing from your resume.</li>
                      <li>Integrate these missing terms naturally into your experience history or technical projects section.</li>
                      <li>Toggle <span className="font-semibold text-white">"Edit Resume text"</span>, paste your additions, and click <span className="font-semibold text-cyan-300">"⚡ Re-Analyze"</span> to recalculate!</li>
                    </ul>
                  </Card>
                </div>

                {/* Right Panel: Interactive Editor / Highlighted Resume */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 shadow-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Resume Parsing Workspace</h3>
                        <p className="text-[10px] text-slate-400">Tweak details directly inside the browser</p>
                      </div>

                      {/* Mode Toggle Button */}
                      <div className="flex gap-1.5 rounded-lg bg-white/5 p-1 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setWorkspaceMode('preview')}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                            workspaceMode === 'preview' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <IconEye className="h-3.5 w-3.5" /> Preview Scan
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkspaceMode('edit')}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                            workspaceMode === 'edit' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <IconEdit className="h-3.5 w-3.5" /> Edit Resume Text
                        </button>
                      </div>
                    </div>

                    {/* Display modes */}
                    {workspaceMode === 'preview' ? (
                      <div className="space-y-3">
                        <HighlightedResume 
                          text={editedResumeText} 
                          matchedKeywords={results.matchedKeywords} 
                          missingKeywords={results.missingSkills} 
                        />
                        <div className="flex gap-3 justify-center text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span> Matched terms found</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block"></span> Missing terms requested</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea
                          rows="16"
                          value={editedResumeText}
                          onChange={(e) => setEditedResumeText(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-4 font-mono text-xs text-white outline-none focus:border-cyan-400/30 leading-relaxed"
                          placeholder="Paste or write the text contents of your resume here to edit..."
                        />
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-2.5 text-xs font-semibold text-slate-950 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
                        >
                          {loading ? 'Re-Analyzing...' : '⚡ Re-Analyze Resume Changes (Update Score)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: KEYWORDS breakdown */}
            {activeTab === 'keywords' && (
              <div className="space-y-6">
                <Card title="Job Keyword Diagnostics" subtitle="Interactive search checklist of matching capabilities.">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search keywords..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      className="max-w-md w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/40"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Matched skills column */}
                    <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-5">
                      <div className="mb-3 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                          <IconCheck className="h-4.5 w-4.5" /> Matched keywords ({filteredMatched.length})
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filteredMatched.length > 0 ? (
                          filteredMatched.map((skill) => (
                            <Pill key={skill} tone="emerald">
                              {skill}
                            </Pill>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No matched keywords found matching search.</p>
                        )}
                      </div>
                    </div>

                    {/* Missing skills column */}
                    <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-5">
                      <div className="mb-3 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                          <IconWarning className="h-4.5 w-4.5" /> Missing keywords ({filteredMissing.length})
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filteredMissing.length > 0 ? (
                          filteredMissing.map((skill) => (
                            <Pill key={skill} tone="amber">
                              {skill}
                            </Pill>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No missing keywords found matching search.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Suggestions Card */}
                <Card title="Structural Improvement Suggestions" subtitle="Dynamic checklist of action items.">
                  <div className="grid gap-3">
                    {results.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4 text-xs">
                        <span className="text-amber-400 mt-0.5"><IconWarning className="h-4 w-4" /></span>
                        <p className="text-slate-200 leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: AI TAILOR BULLETS */}
            {activeTab === 'tailor' && (
              <div className="space-y-6">
                <Card 
                  title="Tailor Experience Bullet Points with AI" 
                  subtitle="Rewrite parts of your experience to naturally align with the job description using Gemini."
                >
                  <div className="space-y-4">
                    {aiError && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                        {aiError}
                      </div>
                    )}

                    {!geminiApiKey ? (
                      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-12 w-12 text-slate-400 mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-white">Gemini API Key Required</h4>
                        <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                          Please enter your Gemini API Key in the top settings banner to generate smart tailored bullet points for your resume.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex gap-3 text-xs">
                          <span className="text-cyan-400"><IconInfo className="h-4 w-4" /></span>
                          <div>
                            <p className="font-semibold text-white">Optimization Strategy</p>
                            <p className="mt-1 text-slate-400 leading-relaxed">
                              This action will evaluate your experience and generate new high-impact bullet points containing missing skills: <strong className="text-amber-200">{results.missingSkills.slice(0, 5).join(', ')}</strong>.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleOptimizeBullets}
                          disabled={aiLoading.bullets}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition"
                        >
                          {aiLoading.bullets ? 'Generating Tailored Bullet Points...' : '⚡ Generate Optimized Resume Bullets'}
                        </button>

                        {aiOutputs.bullets && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tailored Resume Suggestions</h4>
                              <button
                                type="button"
                                onClick={() => copyTextToClipboard(aiOutputs.bullets)}
                                className="flex items-center gap-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px]"
                              >
                                <IconCopy className="h-3 w-3" /> Copy Markdown
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed border border-white/5 bg-slate-950/80 p-5 rounded-2xl max-h-[500px] overflow-y-auto">
                              {aiOutputs.bullets}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 5: AI COVER LETTER */}
            {activeTab === 'coverletter' && (
              <div className="space-y-6">
                <Card 
                  title="Generate Tailored Cover Letter" 
                  subtitle="Generate a professional custom-tailored cover letter based on your matched resume experiences."
                >
                  <div className="space-y-4">
                    {aiError && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                        {aiError}
                      </div>
                    )}

                    {!geminiApiKey ? (
                      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-12 w-12 text-slate-400 mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-white">Gemini API Key Required</h4>
                        <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                          Please enter your Gemini API Key in the top settings banner to enable the Cover Letter Generator.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <button
                          type="button"
                          onClick={handleGenerateCoverLetter}
                          disabled={aiLoading.cover}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition"
                        >
                          {aiLoading.cover ? 'Generating Cover Letter...' : '⚡ Generate Cover Letter'}
                        </button>

                        {aiOutputs.cover && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tailored Cover Letter Output</h4>
                              <button
                                type="button"
                                onClick={() => copyTextToClipboard(aiOutputs.cover)}
                                className="flex items-center gap-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px]"
                              >
                                <IconCopy className="h-3 w-3" /> Copy Cover Letter
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed border border-white/5 bg-slate-950/80 p-5 rounded-2xl max-h-[500px] overflow-y-auto">
                              {aiOutputs.cover}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 6: INTERVIEW PREP */}
            {activeTab === 'interview' && (
              <div className="space-y-6">
                <Card 
                  title="Generate Tailored Interview Questions" 
                  subtitle="Prepare behavioral and technical questions customized around your profile match details."
                >
                  <div className="space-y-4">
                    {aiError && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                        {aiError}
                      </div>
                    )}

                    {!geminiApiKey ? (
                      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-12 w-12 text-slate-400 mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-white">Gemini API Key Required</h4>
                        <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                          Please enter your Gemini API Key in the top settings banner to enable the Interview Preparation Assistant.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <button
                          type="button"
                          onClick={handleGenerateInterview}
                          disabled={aiLoading.interview}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition"
                        >
                          {aiLoading.interview ? 'Generating Questions...' : '⚡ Generate Tailored Interview Questions'}
                        </button>

                        {aiOutputs.interview && (
                          <div className="space-y-2 animate-fadeIn">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tailored Q&amp;A Prep Output</h4>
                              <button
                                type="button"
                                onClick={() => copyTextToClipboard(aiOutputs.interview)}
                                className="flex items-center gap-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px]"
                              >
                                <IconCopy className="h-3 w-3" /> Copy Q&amp;A Sheet
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed border border-white/5 bg-slate-950/80 p-5 rounded-2xl max-h-[500px] overflow-y-auto">
                              {aiOutputs.interview}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
)
}

export default App
