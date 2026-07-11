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
