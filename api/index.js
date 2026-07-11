require("dotenv").config()
const connectToDB = require("../src/config/database")
const app = require("../src/app")

connectToDB()

module.exports = app
