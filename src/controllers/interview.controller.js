// Polyfill browser APIs needed by pdf-parse/pdfjs-dist in serverless environments
if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
            this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
            this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
            this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
            this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
        }
        inverse() { return new DOMMatrix() }
        multiply() { return new DOMMatrix() }
        scale() { return new DOMMatrix() }
        translate() { return new DOMMatrix() }
        transformPoint(p) { return p }
        static fromMatrix() { return new DOMMatrix() }
        static fromFloat64Array() { return new DOMMatrix() }
        static fromFloat32Array() { return new DOMMatrix() }
    }
}
if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = class Path2D {
        constructor() {}
        moveTo() {}
        lineTo() {}
        bezierCurveTo() {}
        quadraticCurveTo() {}
        arc() {}
        closePath() {}
        rect() {}
    }
}

const mongoose = require("mongoose")
const { generateInterviewReport , generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")


/**
 * @description Controller to generate interview report based on resume, self-description, and job description
 */
async function generateInterviewReportController(req, res) {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({
            message: "Resume file is required"
        })
    }

    try {
        const pdfParse = require("pdf-parse")
        const parsedResume = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
        const resumeContent = parsedResume.text || ""
        const rawJobDescription = req.body.jobDescription || req.body.jobDescripition || ""
        const selfDescription = req.body.selfDescription || ""

        const interviewReportByAi = await generateInterviewReport(
            resumeContent,
            selfDescription,
            rawJobDescription
        )

        const finalJobDescription = rawJobDescription || interviewReportByAi.title || ""

        if (!finalJobDescription.trim()) {
            return res.status(400).json({
                message: "Job description is required"
            })
        }

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent,
            selfDescription,
            jobDescription: finalJobDescription,
            ...interviewReportByAi,
            jobDescription: finalJobDescription
        })

        return res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        })
    } catch (error) {
        console.error("Interview generation failed:", error)
        return res.status(500).json({
            message: "Failed to generate interview report",
            error: error.message
        })
    }
}


/**
 * @description Controller to get interview report by ID
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found"
        })
    }

    return res.status(200).json({
        message: "Interview report retrieved successfully",
        interviewReport
    })
}

/**
 * @description Controller to get all interview reports of the logged-in user
 */
async function getAllInterviewReportsController(req, res) {

    const interviewReports = await interviewReportModel.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select("-resume -selfDescription -jobDescription -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

   return res.status(200).json({  
    message: "Interview reports retrieved successfully",
    interviewReports
   })
}

/**
 * @description Controller to generate resume PDF based on user self Description , resume and job Description 
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        if (!mongoose.isValidObjectId(interviewReportId)) {
            return res.status(400).json({
                message: "Invalid interview report id."
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found for this user."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (error) {
        console.error("Resume PDF generation failed:", error)
        return res.status(500).json({
            message: "Failed to generate resume PDF",
            error: error.message
        })
    }
}



module.exports = { generateInterviewReport: generateInterviewReportController, getInterviewReportById: getInterviewReportByIdController, getAllInterviewReports: getAllInterviewReportsController , generateResumePdfController }
