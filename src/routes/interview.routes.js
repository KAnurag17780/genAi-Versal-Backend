const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const interviewRouter = express.Router()
const upload = require("../middlewares/file.middleware")
/**
 * @route POST /api/interview
 * @description generate new interview report on the basis of user self description , resuume pdf and job description
 * @access private
 */

interviewRouter.post("/",authMiddleware.authUser,upload.single("resume"),interviewController.generateInterviewReport) // generate interview report for user 

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by id
 * @access private  
 */

interviewRouter.get("/report/:interviewId",authMiddleware.authUser,interviewController.getInterviewReportById) // get interview report by id


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user
 * @access private
 */

interviewRouter.get("/",authMiddleware.authUser,interviewController.getAllInterviewReports) // get all interview reports of logged in user      


/**
 * @route POST /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)
interviewRouter.get("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)








module.exports = interviewRouter  // goto app.js
