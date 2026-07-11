const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.modle")

/**
 *  @name regiserUserController
 *  @description Register a new user , expects username ,email and body
 *  @access Public 
 */

async function registerUserController(req,res) {

    const {username , email , password } = req.body

    if(!username||!email||!password)
    {
        return res.status(400).json({
            message:"please provide username,emailand password"
        })
    }
    const isUserAlreadyExists = await userModel.findOne({
        $or: [{username} , {email}]
    })


    if(isUserAlreadyExists)
    {
        /*isUserAlreadyExists.username == username*/
        return res.status(400).json({
            message:"Account already exists with email address or username"
        })
    }

    const hash = await bcrypt.hash(password , 10 )

    const user = await userModel.create({
        username,
        email,
        password : hash
    })

    // creating token
    const token = jwt.sign(
       {id : user._id , username: user.username},
       process.env.JWT_SECRET ,
       {expiresIn : "1d"} 
    )

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    })

    // sent when createing resource(user)
    res.status(201).json({
        message : "User registered sucessfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name loginUserController
 * @description login a user , expects email and password  in your request body
 * @access Public
 */

async function loginUserController(req , res)
{   
    const {email , password} = req.body 

    const user = await userModel.findOne({email})

    if(!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid= await bcrypt.compare(password , user.password)

    if(!isPasswordValid)
    {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
       {id : user._id , username: user.username},
       process.env.JWT_SECRET ,
       {expiresIn : "1d"} 
    )

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    })

    res.status(200).json({
        message: "User loggedin Sucessfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name logoutUserController
 * @description Clear token from usercookies and add user to black list
 * @access Public
 */

async function logoutUserController(req, res) {

    const token =  req.cookies.token

    if(token) {
        await tokenBlacklistModel.create({ token })

    }

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out sucessfully " 
    })

}

/**
 * @name getMeController
 * @description get the curent logged  in user details.
 * @access Public
 */

async function getMeController(req,res)
{
    // gets the decoded data from auth.middleware
    const user = await userModel.findById(req.user.id)

    res.status(200).json({
        message: "User detail fetched sucessfully",
        user:
        {
            id : user.id ,
            username : user.username,
            email: user.email
        }
    })
}



module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}