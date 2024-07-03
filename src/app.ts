import express, { NextFunction, Request, Response } from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
//import cors from "cors";
//import globalErrorHandler from "./middlewares/globalErrorHandler";
// import userRouter from "./user/userRouter";
// import bookRouter from "./book/bookRouter";

const app = express();

// Routes
// HTTP GET, POST, PUT, PATCH, DELETE
app.get("/", (req, res, next) => {
    res.json({message:"Hello World!"});
});

// Global error handler
app.use(globalErrorHandler);


export default app;