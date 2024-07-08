import { ObjectId } from 'mongoose';
import {User} from "../user/userTypes";

export interface Tour {
    name: string;
    description: string;
    author: User;
    coverImage: string;
    file: string;
  }