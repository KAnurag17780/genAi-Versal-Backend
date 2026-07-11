const  { GoogleGenAI } = require("@google/genai")
const {z} = require("zod")
const {zodToJsonSchema} = require("zod-to-json-schema")

const ai = new GoogleGenAI({
    apiKey : process.env.GOOGLE_GENAI_API_KEY
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function generateContentWithRetry(options, retries = 2) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await ai.models.generateContent(options)
    } catch (error) {
      lastError = error

      if (attempt < retries) {
        await sleep(700 * (attempt + 1))
      }
    }
  }

  throw lastError
}

  const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

function normalizeInterviewReport(report = {}) {
  const parseJsonObject = item => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return item
    }

    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed
        }
      } catch {
        return null
      }
    }

    return null
  }

  const normalizeTechnicalQuestions = value => {
    if (!value) return []
    const items = Array.isArray(value) ? value : [value]
    return items.map(item => {
      const obj = parseJsonObject(item) || { question: String(item || "") }
      return {
        question: String(obj.question || obj.questions || "").trim() || "Technical question not provided",
        intention: String(obj.intention || obj.intent || "").trim() || "No clear interviewer intention was provided.",
        answer: String(obj.answer || "").trim() || "No answer guidance was provided.",
      }
    }).filter(item => item.question)
  }

  const normalizeBehavioralQuestions = value => {
    if (!value) return []
    const items = Array.isArray(value) ? value : [value]
    return items.map(item => {
      const obj = parseJsonObject(item) || { question: String(item || "") }
      return {
        question: String(obj.question || obj.questions || "").trim() || "Behavioral question not provided",
        intention: String(obj.intention || obj.intent || "").trim() || "No clear interviewer intention was provided.",
        answer: String(obj.answer || "").trim() || "No answer guidance was provided.",
      }
    }).filter(item => item.question)
  }

  const normalizeSkillGaps = value => {
    if (!value) return []
    const items = Array.isArray(value) ? value : [value]
    return items.map(item => {
      const obj = parseJsonObject(item) || { skill: String(item || "") }
      return {
        skill: String(obj.skill || "").trim(),
        severity: String(obj.severity || obj.level || "medium").trim().toLowerCase() || "medium",
      }
    }).filter(item => item.skill)
  }

  const normalizePreparationPlan = value => {
    if (!value) return []
    const items = Array.isArray(value) ? value : [value]
    return items.map(item => {
      const obj = parseJsonObject(item) || { focus: String(item || "") }
      return {
        day: Number(obj.day) || 1,
        focus: String(obj.focus || "").trim(),
        tasks: Array.isArray(obj.tasks) ? obj.tasks.map(String) : [String(obj.tasks || obj.task || "")].filter(Boolean),
      }
    }).filter(item => item.focus)
  }

  return {
    ...report,
    matchScore: typeof report.matchScore === "number" ? report.matchScore : Number(report.matchScore) || 0,
    title: String(report.title || report.jobTitle || "").trim(),
    technicalQuestions: normalizeTechnicalQuestions(report.technicalQuestions),
    behavioralQuestions: normalizeBehavioralQuestions(report.behavioralQuestions),
    skillGaps: normalizeSkillGaps(report.skillGaps),
    preparationPlan: normalizePreparationPlan(report.preparationPlan),
  }
}

 async function generateInterviewReport(resume , selfDescription , jobDescription  ) {
   const safeResume = String(resume || "").trim().slice(0, 6000)
   const safeSelfDescription = String(selfDescription || "").trim()
   const safeJobDescription = String(jobDescription || "").trim()

   const prompt = `You are an expert interview coach. Analyze the candidate profile and the target role, then generate a complete interview report in valid JSON only.

Requirements:
- Always return exactly one JSON object and nothing else.
- Do not use markdown fences, bullet lists outside JSON, or any explanatory text.
- Populate every field with meaningful, relevant content.
- When the resume or job description mention cloud, infrastructure, or developer tools, include those details in the report.
- Include the candidate's most relevant technologies and methodologies, such as Git, AWS, Kubernetes, PostgreSQL, Agile, Test-Driven Development, and CI/CD, when they are applicable.

Output structure:
{
  "matchScore": number,
  "title": string,
  "technicalQuestions": [
    { "question": string, "intention": string, "answer": string }
  ],
  "behavioralQuestions": [
    { "question": string, "intention": string, "answer": string }
  ],
  "skillGaps": [
    { "skill": string, "severity": "low" | "medium" | "high" }
  ],
  "preparationPlan": [
    { "day": number, "focus": string, "tasks": [string] }
  ]
}

Resume:
${safeResume}

Self Description:
${safeSelfDescription}

Job Description:
${safeJobDescription}`

    const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config : {
            temperature: 0.2,
            maxOutputTokens: 2000,
            responseMimeType : "application/json",
            responseSchema : zodToJsonSchema(interviewReportSchema),
        }
    })

 const rawText = typeof response?.text === "string" ? response.text : ""
 const parsed = extractJsonObject(rawText)
 return normalizeInterviewReport(parsed)
 
}

function extractJsonObject(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("AI response did not contain text")
  }

  const text = rawText.trim()

  const removeCodeFence = input => {
    const fenced = input.match(/```(?:json)?\n([\s\S]*?)\n```/i)
    return fenced ? fenced[1].trim() : input
  }

  const cleanedText = removeCodeFence(text)

  try {
    return JSON.parse(cleanedText)
  } catch (initialError) {
    const firstBracket = cleanedText.search(/[\[{]/)
    const lastBracket = Math.max(cleanedText.lastIndexOf("}"), cleanedText.lastIndexOf("]"))

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleanedText.slice(firstBracket, lastBracket + 1)
      try {
        return JSON.parse(candidate)
      } catch (candidateError) {
        const normalized = candidate.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
        try {
          return JSON.parse(normalized)
        } catch (normalizedError) {
          throw new Error(`Invalid JSON response from AI: ${normalizedError.message}`)
        }
      }
    }

    throw new Error(`Invalid JSON response from AI: ${initialError.message}`)
  }
}

async function generatePdfFromHtml(htmlContent) {
    const chromium = (await import("@sparticuz/chromium-min")).default
    const puppeteer = (await import("puppeteer-core")).default

    const executablePath = await chromium.executablePath(
        "https://github.com/nichochar/chromium-binaries/raw/refs/heads/main/chromium-v133.0.0-pack.tar"
    )

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
    })
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" })

      const pdfBuffer = await page.pdf({
          format: "A4", margin: {
              top: "20mm",
              bottom: "20mm",
              left: "15mm",
              right: "15mm"
          }
      })

      return pdfBuffer
    } finally {
        await browser.close()
    }
}

function extractHtmlContent(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
        throw new Error("AI response did not contain HTML")
    }

    const text = rawText.trim()
    const fenced = text.match(/```(?:html)?\n([\s\S]*?)\n```/i)
    const html = fenced ? fenced[1].trim() : text

    if (!html.includes("<html") && !html.includes("<body")) {
        throw new Error("AI response was not valid resume HTML")
    }

    return html
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function buildFallbackResumeHtml({ resume, selfDescription, jobDescription }) {
    const resumeLines = String(resume || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 80)

    const summary = String(selfDescription || "").trim()
    const targetRole = String(jobDescription || "").trim()

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resume</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; margin: 0; }
    h1 { font-size: 28px; margin: 0 0 8px; color: #0f172a; }
    h2 { font-size: 15px; margin: 22px 0 8px; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #dbeafe; padding-bottom: 5px; }
    p { margin: 0 0 8px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 5px; }
    .muted { color: #475569; }
  </style>
</head>
<body>
  <h1>Resume</h1>
  ${targetRole ? `<p class="muted"><strong>Target role:</strong> ${escapeHtml(targetRole).slice(0, 600)}</p>` : ""}
  ${summary ? `<h2>Professional Summary</h2><p>${escapeHtml(summary)}</p>` : ""}
  <h2>Resume Details</h2>
  <ul>
    ${resumeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
  </ul>
</body>
</html>`
}

async function generateResumePdf({resume,selfDescription,jobDescription}){
  const safeResume = String(resume || "").trim().slice(0, 6000)
  const safeSelfDescription = String(selfDescription || "").trim().slice(0, 2000)
  const safeJobDescription = String(jobDescription || "").trim().slice(0, 3000)

  const prompt = `Generate a polished, ATS-friendly resume as a complete HTML document.

Requirements:
- Return only HTML. Do not return JSON, markdown, or code fences.
- Include <!doctype html>, html, head, style, and body.
- Keep styles inline in a <style> tag.
- Use the candidate resume as the source of truth.
- Tailor the summary, skills, and project bullets toward the job description.
- Do not invent companies, degrees, dates, or contact information.

Resume:
${safeResume}

Self Description:
${safeSelfDescription}

Job Description:
${safeJobDescription}`

  try {
    const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config : {
            temperature: 0.2,
            maxOutputTokens: 3000,
        }
    })

    const htmlContent = extractHtmlContent(response.text)
    return generatePdfFromHtml(htmlContent)
  } catch (error) {
    console.error("AI resume HTML generation failed, using fallback HTML:", error.message)
    const fallbackHtml = buildFallbackResumeHtml({
        resume: safeResume,
        selfDescription: safeSelfDescription,
        jobDescription: safeJobDescription
    })
    return generatePdfFromHtml(fallbackHtml)
  }
}

module.exports = { generateInterviewReport  , generateResumePdf  }
