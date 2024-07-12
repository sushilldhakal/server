// Create a custom typings file (e.g., typings/express.d.ts)
import { Request } from 'express';

// Define a new interface that extends the existing Request interface
declare module 'express' {
    interface Request {
        breadcrumbs: string[]; // Define the type of breadcrumbs property
    }
}

