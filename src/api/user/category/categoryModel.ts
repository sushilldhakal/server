import mongoose, { Schema, Document } from "mongoose";

// Define UserCategory Schema
interface UserCategory extends Document {
  name: string;
  description: string;
  imageUrl: string;
  slug: string;
  isActive: boolean;
  user: mongoose.Schema.Types.ObjectId;
}

const userCategorySchema = new Schema<UserCategory>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<UserCategory>("Category", userCategorySchema);
