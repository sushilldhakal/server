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
        enum: ['user', 'admin', 'seller', 'subscriber'],
        default: 'user',
      },
      avatar: {
        type: String,
      },
      phone: {
        type: Number,
      },
      wishlists: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tour",
        },],
        bookings: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tour",
        },],
        reviews: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tour",
        },],
        payment_methods: [
          {
            cardNumber: {type: String},
            expirationDate: {type: String},
            cardholderName: {type: String},
          }
        ],
      verified : {
        type: Boolean,
        default: false
      }
},
    {timestamps: true},
);

  export default mongoose.model<User>("User", userSchema);