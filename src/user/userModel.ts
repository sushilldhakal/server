import mongoose, {Schema} from "mongoose";

const addressSchema = new Schema({
    street: String,
    city: String,
    state: String,
    zip_code: String,
    country: String
  });

  const bookingSchema = new Schema({
    booking_id: { type: Schema.Types.ObjectId, required: true },
    package_id: { type: Schema.Types.ObjectId, required: true },
    booking_date: { type: Date, required: true },
    travel_date: { type: Date, required: true },
    status: { type: String, required: true },
    total_price: { type: Number, required: true },
    payment_status: { type: String, required: true }
  });
  
  const paymentMethodSchema = new Schema({
    type: { type: String, required: true },
    details: {
      card_number: String,
      expiry_date: String,
      cardholder_name: String,
      billing_address: addressSchema,
      email: String
    }
  });
  
  const wishlistSchema = new Schema({
    package_id: { type: Schema.Types.ObjectId, required: true },
    added_date: { type: Date, required: true }
  });
  
  const reviewSchema = new Schema({
    review_id: { type: Schema.Types.ObjectId, required: true },
    package_id: { type: Schema.Types.ObjectId, required: true },
    review_date: { type: Date, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true }
  });

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: {
        type: [String],
        enum: ['user', 'admin', 'company', 'subscriber'],
        default: ['user'],
        // validate: {
        //   validator: function(v: string[]) {
        //     return v.length > 0;
        //   },
        //   message: 'A user must have at least one role.'
        // }
      },
    phone: { type: String },
    address: addressSchema,
    preferences: {
      language: { type: String },
      currency: { type: String },
      newsletter_subscribed: { type: Boolean }
    },
    bookings: [bookingSchema],
    payment_methods: [paymentMethodSchema],
    wishlist: [wishlistSchema],
    reviews: [reviewSchema]
},
    {timestamps: true},
);

// Pre-save hook to enforce only one admin
userSchema.pre('save', async function(next) {
    const user = this;
  
    if (user.roles.includes('admin')) {
      const adminCount = await mongoose.models.User.countDocuments({ roles: 'admin' });
  
      // If there is already an admin and the current user is not an admin, prevent saving
      if (adminCount > 0 && !user.isModified('roles')) {
        const currentAdmin = await mongoose.models.User.findOne({ roles: 'admin' });
        if (currentAdmin && currentAdmin._id.toString() !== user._id.toString()) {
          throw new Error('Only one admin is allowed.');
        }
      }
    }
  
    next();
  });

export default mongoose.model("User", userSchema)