import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import userModel from "./userModel";

const createUser = async (req: Request, res: Response, next: NextFunction) => {


    const {name, email, password, role}  = req.body;
    //validation
    if(!name || !email || !password || !role){
        const error = createHttpError(400, "All fields are required");
        return next(error);
    }
    //Database call
    const user = await userModel.findOne({email});
    if(user){
        const error = createHttpError(400, "User already exists");
        return next(error);
    }
    //process
    //response

    res.json({message: "user created"})

}
export {createUser};