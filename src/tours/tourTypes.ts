import mongoose, { ObjectId } from 'mongoose';
import {User} from "../user/userTypes";

export interface Tour {
    name: string;
    description: string;
    author: mongoose.Types.ObjectId | User;
    authorName: User;
    coverImage: string;
    file: string;
    createdAt: Date;
  updatedAt: Date;
  status: string;
  }