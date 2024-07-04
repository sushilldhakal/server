import mongoose from "mongoose";

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      trim: true,
    },
    overview: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
    },
    dates: [
      {
        date: {
          type: Date,
        },
        price: {
          type: Number,
        },
      },
    ],
    duration: {
      type: Number,
    },
    discountPrice: { type: Number },
    startLocation: {
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      country: {
        type: String,
      },
      coordinates: {
        type: [Number],
        // validate: {
        //   validator: function (v: string[]) {
        //     return v.length === 2;
        //   },
        // },
      },
    },
    locations: [
      {
        address: {
          type: String,
        },
        city: {
          type: String,
        },
        state: {
          type: String,
        },
        country: {
          type: String,
        },
        coordinates: {
          type: [Number],
          // validate: {
          //   validator: function (v: string[]) {
          //     return v.length === 2;
          //   },
          // },
        },
        day: {
          type: Number,
        },
      },
    ],
    itinerary: [
      {
        title: {
          type: String,
  
        },
        label: {
          type: String,
  
        },
        date: {
          type: Date,
  
        },
        time: {
          type: String,
  
        },
        description: {
          type: String,
  
        },
      },
    ],
    includes: {
      type: [String],
    },
    excludes: {
      type: [String],
    },
    facts: {
      type: [String],
    },
    gallery: {
      type: [String],
    },
    location: {
      type: String,
    },
    checkout: {
      type: [String],
    },
    FAQs: [
      {
        question: {
          type: String,
  
        },
        answer: {
          type: String,
  
        },
      },
    ],
    downloads: {
      type: [String],
    },
    maxGroupSize: {
      type: Number,
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'Difficulty is either: easy, medium, hard',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    guides: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);


export default mongoose.model("Tour", tourSchema)