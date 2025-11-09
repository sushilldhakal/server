import mongoose from 'mongoose';
import BookingModel from '../bookingModel';
import { Booking } from '../bookingTypes';
import { PaginationParams, paginate } from '../../../utils/pagination';
import createHttpError from 'http-errors';
import { BaseService } from '../../../services/BaseService';

/**
 * Booking Service Layer
 * Contains all business logic for booking operations
 */
export class BookingService extends BaseService<Booking> {
    private static instance: BookingService;

    constructor() {
        super(BookingModel);
    }

    /**
     * Get singleton instance
     */
    static getInstance(): BookingService {
        if (!BookingService.instance) {
            BookingService.instance = new BookingService();
        }
        return BookingService.instance;
    }

    /**
     * Create a new booking
     */
    async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
        try {
            // Validate required fields
            if (!bookingData.tour || !bookingData.departureDate) {
                throw createHttpError(400, 'Tour and departure date are required');
            }

            // Create booking
            const booking = await this.create(bookingData);

            return booking;
        } catch (error: any) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    /**
     * Get all bookings with filtering and pagination
     */
    async getAllBookings(filters: any = {}, paginationParams: PaginationParams) {
        const result = await paginate(BookingModel, filters, paginationParams);

        // Populate tour and user information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, [
                { path: 'tour', select: 'title code coverImage price' },
                { path: 'user', select: 'name email' }
            ]);
            result.items = populatedItems;
        }

        return result;
    }

    /**
     * Get booking by ID
     */
    async getBookingById(bookingId: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const booking = await BookingModel
            .findById(bookingId)
            .populate('tour', 'title code coverImage price location')
            .populate('user', 'name email phone')
            .lean();

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        return booking;
    }

    /**
     * Get booking by reference
     */
    async getBookingByReference(reference: string) {
        const booking = await BookingModel
            .findOne({ bookingReference: reference })
            .populate('tour', 'title code coverImage price location')
            .populate('user', 'name email phone')
            .lean();

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        return booking;
    }

    /**
     * Get user bookings
     */
    async getUserBookings(userId: string, paginationParams: PaginationParams) {
        const query = { user: userId };
        const result = await paginate(BookingModel, query, paginationParams);

        // Populate tour information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, {
                path: 'tour',
                select: 'title code coverImage price location'
            });
            result.items = populatedItems;
        }

        return result;
    }

    /**
     * Get tour bookings
     */
    async getTourBookings(tourId: string, paginationParams: PaginationParams) {
        const query = { tour: tourId };
        const result = await paginate(BookingModel, query, paginationParams);

        // Populate user information
        if (result.items && result.items.length > 0) {
            const populatedItems = await BookingModel.populate(result.items, {
                path: 'user',
                select: 'name email phone'
            });
            result.items = populatedItems;
        }

        return result;
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(bookingId: string, status: string, notes?: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const updateData: any = { status };

        if (status === 'confirmed') {
            updateData.confirmedAt = new Date();
        } else if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
            if (notes) {
                updateData.cancellationReason = notes;
            }
        }

        if (notes && status !== 'cancelled') {
            updateData.notes = notes;
        }

        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: true }
        ).populate('tour', 'title code');

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        return booking;
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(
        bookingId: string,
        paymentStatus: string,
        paidAmount?: number,
        transactionId?: string
    ) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw createHttpError(400, 'Invalid booking ID');
        }

        const updateData: any = { paymentStatus };

        if (paidAmount !== undefined) {
            updateData.paidAmount = paidAmount;
        }

        if (transactionId) {
            updateData.transactionId = transactionId;
        }

        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        return booking;
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId: string, reason?: string) {
        return this.updateBookingStatus(bookingId, 'cancelled', reason);
    }

    /**
     * Get booking statistics
     */
    async getBookingStats() {
        const stats = await BookingModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.totalPrice' },
                    paidRevenue: { $sum: '$paidAmount' }
                }
            }
        ]);

        return stats;
    }

    // Static methods for backward compatibility
    static async createBooking(bookingData: Partial<Booking>) {
        return BookingService.getInstance().createBooking(bookingData);
    }

    static async getAllBookings(filters: any, paginationParams: PaginationParams) {
        return BookingService.getInstance().getAllBookings(filters, paginationParams);
    }

    static async getBookingById(bookingId: string) {
        return BookingService.getInstance().getBookingById(bookingId);
    }

    static async getBookingByReference(reference: string) {
        return BookingService.getInstance().getBookingByReference(reference);
    }

    static async getUserBookings(userId: string, paginationParams: PaginationParams) {
        return BookingService.getInstance().getUserBookings(userId, paginationParams);
    }

    static async getTourBookings(tourId: string, paginationParams: PaginationParams) {
        return BookingService.getInstance().getTourBookings(tourId, paginationParams);
    }

    static async updateBookingStatus(bookingId: string, status: string, notes?: string) {
        return BookingService.getInstance().updateBookingStatus(bookingId, status, notes);
    }

    static async updatePaymentStatus(
        bookingId: string,
        paymentStatus: string,
        paidAmount?: number,
        transactionId?: string
    ) {
        return BookingService.getInstance().updatePaymentStatus(bookingId, paymentStatus, paidAmount, transactionId);
    }

    static async cancelBooking(bookingId: string, reason?: string) {
        return BookingService.getInstance().cancelBooking(bookingId, reason);
    }

    static async getBookingStats() {
        return BookingService.getInstance().getBookingStats();
    }
}
