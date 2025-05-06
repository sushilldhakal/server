import mongoose from "mongoose";
import { User } from "./userTypes";

// Schema for seller information (nested within user)
const sellerInfoSchema = new mongoose.Schema({
  companyName: {
    type: String,
  },
  companyRegistrationNumber: {
    type: String,
  },
  companyType: {
    type: String,
  },
  registrationDate: {
    type: String,
  },
  taxId: {
    type: String,
  },
  website: {
    type: String,
    default: ''
  },
  businessAddress: {
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    country: {
      type: String,
    }
  },
  bankDetails: {
    bankName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    accountHolderName: {
      type: String,
    },
    branchCode: {
      type: String,
    }
  },
  businessDescription: {
    type: String,
  },
  sellerType: {
    type: String,
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  }
});

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
      },
      sellerInfo: sellerInfoSchema // Add seller information schema
},
    {timestamps: true},
);

  export default mongoose.model<User>("User", userSchema);