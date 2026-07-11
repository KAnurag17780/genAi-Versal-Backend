const {Router} = require('express')
const authController = require("../controllers/auth.controller")
const authMiddleware  = require("../middlewares/auth.middleware")
const authRouter = Router()

/**
 * @route POST api/auth/register
 * @description Register new user
 * @access Public
 */

authRouter.post("/register",authController.registerUserController)

/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public 
 */
authRouter.post("/login",authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @description clear cookie tken from user cookie and add token in the blacklist
 * @acess public
 */
authRouter.get("/logout",authController.logoutUserController)

/**
 * @router GET api/auth/get-me
 * @description get the current user logged in details
 * @access Private
 */
authRouter.get("/get-me",authMiddleware.authUser, authController.getMeController)


module.exports = authRouter