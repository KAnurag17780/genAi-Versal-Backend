require("dotenv").config() // for configurations , db variablle  urls 
const app = require("./src/app")
const connectToDB = require("./src/config/database")



connectToDB()

// Only listen locally — Vercel handles this in production
if (process.env.NODE_ENV !== "production") {
    app.listen(3000,()=>{
        console.log("Server is running on port 3000")
    })
}

module.exports = app