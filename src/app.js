const express = require("express")
const app =  express()
const cookieParser = require("cookie-parser")
const cors = require("cors")


app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^https:\/\/gen-ai-versal-frontend.*\.vercel\.app$/
]

const frontendUrl = process.env.FRONTEND_URL

app.use(cors({
    origin: (origin, callback) => {
        // allow non-browser (no origin) requests
        if (!origin) {
            callback(null, true)
            return
        }

        // allow explicit frontend URL from env
        if (frontendUrl && origin === frontendUrl) {
            callback(null, true)
            return
        }

        // allow localhost and Vercel preview deployments
        if (allowedOrigins.some((allowedOrigin) => allowedOrigin.test(origin))) {
            callback(null, true)
            return
        }

        callback(new Error("Not allowed by CORS"))
    },
    credentials: true
}))

// require all the routes here
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
app.use("/api/auth",authRouter) // using all the routes here , url for router
app.use("/api/interview",interviewRouter)


module.exports = app
