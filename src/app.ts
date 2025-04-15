import express from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./api/user/userRouter";
import tourRouter from "./api/tours/tourRouter";
import tourSearchRouter from "./api/tours/tourSearchRouter";
// import destinationRouter from "./api/destinations/destinationRouter";
import cors from "cors";
import { config } from "./config/config";
import breadcrumbsMiddleware from "./middlewares/breadcrumbsMiddleware";
import galleryRoutes from "./api/gallery/galleryRoutes";
import generateRouter from "./api/generate/generateRoute";
import subscriberRouter from "./api/subscriber/subscriberRouter";
import categoryRouter from "./api/user/category/categoryRoutes";
import factsRouter from "./api/user/facts/factsRoutes";
import faqsRouter from "./api/user/faq/faqRouter";
import postRouter from "./api/post/postRoute";

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
// app.use("/api/destinations", destinationRouter);
app.use('/api/subscribers', subscriberRouter);
app.use("/api/gallery", galleryRoutes);
app.use("/api/generate", generateRouter);
app.use("/api/category", categoryRouter);
app.use("/api/posts", postRouter);
app.use("/api/facts", factsRouter);
app.use("/api/faqs", faqsRouter);
// Global error handler
app.use(globalErrorHandler);

export default app;
