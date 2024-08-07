import express from "express";
import {generateCompletion, applyRateLimiting} from "./generate";

const generateRouter = express.Router();

//routes


generateRouter.post('/', applyRateLimiting, generateCompletion);




export default generateRouter;