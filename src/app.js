const express = require("express")
const app =  express()
const cookieParser = require("cookie-parser")
const cors = require("cors")


app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some((allowedOrigin) => allowedOrigin.test(origin))) {
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
