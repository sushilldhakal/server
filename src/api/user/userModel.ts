import mongoose from "mongoose";
import { User } from "./userTypes";



const userSchema = new mongoose.Schema<User>({
    name: {
        type: String,
        required: true,
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: {
        type: String,
        enum: ['user', 'admin', 'company', 'subscriber'],
        default: 'user',
      },
      phone: {
        type: Number,
      },
      verified : {
        type: Boolean,
        default: false
      }
},
    {timestamps: true},
);

  export default mongoose.model<User>("User", userSchema);