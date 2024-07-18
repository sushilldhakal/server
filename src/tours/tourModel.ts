import mongoose from "mongoose";

import {Tour} from "./tourTypes";

const tourSchema = new mongoose.Schema<Tour>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
    },
    author: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
  }],

      coverImage: {
        type: String,
    },
    file: {
        type: String,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived', 'Expired'],
      default: 'Published',
  },
},
{ timestamps: true }
);


export default mongoose.model<Tour>("Tour", tourSchema)