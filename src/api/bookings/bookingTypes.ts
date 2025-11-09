import mongoose, { Document } from 'mongoose';

export interface BookingGuest {
    fullName: string;
    email: string;
    phone: string;
    country?: string;
}

export interface BookingParticipants {
    adults: number;
    children: number;
    infants?: number;
}

export interface BookingPricing {
    basePrice: number;
    adultPrice: number;
    childPrice: number;
    infantPrice?: number;
    totalPrice: number;
    currency: string;
}

export interface Booking extends Document {
    // Tour reference
    tour: mongoose.Types.ObjectId;
    tourTitle: string;
    tourCode: string;

    // User reference (optional for guest bookings)
    user?: mongoose.Types.ObjectId;

    // Guest information (for non-registered users)
    isGuestBooking: boolean;
    guestInfo?: BookingGuest;

    // Booking details
    departureDate: Date;
    participants: BookingParticipants;
    pricing: BookingPricing;

    // Contact information
    contactName: string;
    contactEmail: string;
    contactPhone: string;

    // Special requests
    specialRequests?: string;

    // Booking status
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';

    // Payment information
    paymentMethod?: string;
    transactionId?: string;
    paidAmount: number;

    // Timestamps
    bookingDate: Date;
    confirmedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;

    // Metadata
    bookingReference: string;
    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}
