import { ObjectId } from 'mongoose';

export interface Tour {
    name: string;
    overview: string;
    description: string;
    price: number;
    discountPrice?: number; 
    dates: {
      date: Date;
      price: number;
    }[];
    duration: number;
    startLocation: {
      address: string;
      city: string;
      state: string;
      country: string;
      coordinates: [number, number];
    };
    locations: {
      address: string;
      city: string;
      state: string;
      country: string;
      coordinates: [number, number];
      day: number;
    }[];
    itinerary: {
      title: string;
      label: string;
      date: Date;
      time: string;
      description: string;
    }[];
    includes: string[];
    excludes: string[];
    facts: string[];
    gallery: string[];
    location: string;
    checkout: string[];
    FAQs: {
      question: string;
      answer: string;
    }[];
    downloads: string[];
    maxGroupSize: number;
    difficulty: 'easy' | 'medium' | 'hard';
    ratingsAverage: number;
    ratingsQuantity: number;
    guides: ObjectId[];
  }