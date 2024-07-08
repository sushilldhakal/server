import mongoose from "mongoose";

import {Tour} from "./tourTypes";

const tourSchema = new mongoose.Schema<Tour>(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      // add ref
      ref: "User",
      required: true,
  },
      coverImage: {
        type: String,
        required: true,
    },
    file: {
        type: String,
        requied: true,
    },
},
{ timestamps: true }
);


export default mongoose.model<Tour>("Tour", tourSchema)