import mongoose from "mongoose";
import { config } from "./config";

// Connect to MongoDB
const connectDB = async () => {
  try{
    mongoose.connect(config.databaseUrl as string,{})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  }catch (err) {
    console.error("Failed to connect to database.", err);
    process.exit(1);
  }
}
export default connectDB;
