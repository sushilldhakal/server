import express from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./user/userRouter";
import tourRouter from "./tours/tourRouter";
import tourSearchRouter from "./tours/tourSearchRouter";
import cors from "cors";
import { config } from "./config/config";
import breadcrumbsMiddleware from "./middlewares/breadcrumbsMiddleware";
import galleryRoutes from "./gallery/galleryRoutes";
import generateRouter from "./generate/generateRoute";
import subscriberRouter from "./subscriber/subscriberRouter";
import categoryRouter from "./user/category/categoryRoutes";
import factsRouter from "./user/facts/factsRoutes";
import faqsRouter from "./user/faq/faqRouter";

const app = express();

// CORS configuration
app.use(
    cors({
        origin: (origin, callback) => {
            // Check if the origin is in the allowed list or if it's not provided (e.g., for non-browser requests)
            if (config.frontendDomain === origin || config.homePage === origin || !origin) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
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
app.use("/api/tours",tourRouter);

app.use("/api/tour/search",tourSearchRouter);

app.use('/api/subscribers', subscriberRouter);
app.use("/api/gallery", galleryRoutes);
app.use("/api/generate", generateRouter);
app.use("/api/category", categoryRouter);

app.use("/api/facts", factsRouter);

app.use("/api/faqs", faqsRouter);
// Global error handler
app.use(globalErrorHandler);

export default app;
