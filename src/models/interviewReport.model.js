const mongoose = require("mongoose")

/**
 * -job description schema : String
 * -resume text : String 
 * /self description : String 
 * 
 * -matchscore : Number
 * 
 * -Technical questions :
 *      [{
 *          question : "",
 *          intention: "",
 *          anwer : ""
 *      }] // array 
 * 
 * -Behavioural questions :[{
 *      skill: "",
 *      severity,: ""
 *      enum : {"low", "medium" , "high"}
 *  }]
 * 
 * -Skill gaps :[]
 * -Preparation plan :
 * [{
 *      day:Number,
 *      focous:String
 *      tasks:[String]     
 * }] 
 * 
 * -preparation pln :[{
 *      day: Number ,
 *      focous : String , 
 *      tasks : [String]
 * }]
 */

const technicalQuestionsSchema = new mongoose.Schema({
    question : {
        type: String , 
        required: [true , "Technical question is required"]
    }, 
    intention : {
        type: String , 
        required : [true , "Intetion is required "]
    }, 
    answer: {
        type : String , 
        required: [true , "Answer is required"]
    }
},{
    _id : false // no need of _id for createing subdocument for technical questions     
})

const behaviouralQuestionsSchema = new mongoose.Schema({
     question : {
        type: String , 
        required: [true , "Behavioral question is required"]
    }, 
    intention : {
        type: String , 
        required : [true , "Intetion is required "]
    }, 
    answer: {
        type : String , 
        required: [true , "Answer is required"]
    }
} ,{
    _id : false // no need of _id for createing subdocument for behavioural questions     
})

const skillGapsSchema = new mongoose.Schema({
    skill : {
        type: String , 
        required : [true , "Skill is required "]
    },
    severity: {
        type : String , 
        required : [ true , "sSeverity is required " ],
        enum: ["low" , "medium" , "high"] 

    }
}, {
    _id : false 
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type : Number , 
        required : [true , "Day is required "]
    },
    focus : {
        type : String ,
        required: [true ,"Focus is required "]
    }, 
    tasks : [ {
        type : String , 
        required : [true , "Task is required "]
    } ]

})

const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type : String,
        required : [true , "Job description is required"]
    },

    resume: {
        type : String , 
    },

    selfDescription : {
        type : String
    },
    matchScore: {
        type: Number , 
        min: 0 ,
        max : 100 
    },

    technicalQuestions: [technicalQuestionsSchema],
    behavioralQuestions: [behaviouralQuestionsSchema],
    skillGaps: [skillGapsSchema],
    preparationPlan: [preparationPlanSchema] ,
    title: {
        type: String
    },
    user : {
        type : mongoose.Schema.Types.ObjectId , 
        ref : "users" 
    }        


})

const interviewReportModel = mongoose.model("interviewReports",interviewReportSchema)  ;

module.exports = interviewReportModel ;

