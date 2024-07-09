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
        // validate: {
        //   validator: function(v: string[]) {
        //     return v.length > 0;
        //   },
        //   message: 'A user must have at least one role.'
        // }
      },
},
    {timestamps: true},
);

  export default mongoose.model<User>("User", userSchema);