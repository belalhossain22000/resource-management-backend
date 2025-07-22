// Booking.controller: Module file for the Booking.controller functionality.
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { BookingService } from "./Booking.service";

// Controller for creating a booking
const createBooking = catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.createBooking(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Booking Created successfully!",
        data: result,
    });
});

export const BookingController = {
    createBooking,
};