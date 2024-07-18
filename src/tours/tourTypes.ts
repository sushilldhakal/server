import mongoose, { Document, Schema } from 'mongoose';
import {User} from "../user/userTypes";

export interface Tour extends Document {
    title: string;
    description: string;
    author: mongoose.Types.ObjectId | User;
    code: string;
    authorName: User;
    coverImage: string;
    file: string;
    createdAt: Date;
  updatedAt: Date;
  status: string;
  }
