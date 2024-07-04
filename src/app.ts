import express, { NextFunction, Request, Response } from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./user/userRouter";
import tourRouter from "./tours/tourRouter";
import cors from "cors";
import { config } from "./config/config";

const app = express();

app.use(
    cors({
        origin: config.frontendDomain,
    })
);


app.use(express.json());
// Routes
// HTTP GET, POST, PUT, PATCH, DELETE
app.get("/", (req, res, next) => {
    res.json({message:"Hello this is eTravel apis"});
});


app.use("/api/users",userRouter);
app.use("/api/tours",tourRouter);

// Global error handler
app.use(globalErrorHandler);


export default app;