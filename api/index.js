require("dotenv").config()
const connectToDB = require("../src/config/database")
const app = require("../src/app")
const serverless = require("serverless-http")

connectToDB()

module.exports = serverless(app)
