import express from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./user/userRouter";
import tourRouter from "./tours/tourRouter";
import subscriberRouter from "./subscriber/subscriberRouter";
import cors from "cors";
import { config } from "./config/config";
import breadcrumbsMiddleware from "./middlewares/breadcrumbsMiddleware";
import galleryRoutes from "./gallery/galleryRoutes";
import generateRouter from "./generate/generateRoute";


const app = express();

app.use(
    cors({
        origin: config.frontendDomain,
    })
);

app.use(express.json());


// Apply breadcrumbsMiddleware before specific routes
app.use(breadcrumbsMiddleware);

// Routes
app.get("/", (req, res) => {
    res.json({ message: "Hello, this is eTravel APIs" });
});

app.use("/api/users", userRouter);
app.use("/api/tours", tourRouter);
app.use('/api/subscribers', subscriberRouter);
app.use("/api/gallery", galleryRoutes);

app.use("/api/generate", generateRouter);

// Global error handler
app.use(globalErrorHandler);

export default app;
