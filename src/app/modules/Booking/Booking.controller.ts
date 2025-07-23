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

//get all booking
const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const result = await BookingService.getAllBookings(query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bookings retrieve successfully!",
    data: result,
  });
});

//get booking by id
const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await BookingService.getBookingById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking retrieve successfully!",
    data: result,
  });
});

//update booking by id
const updateBooking = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await BookingService.updateBooking(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking updated successfully!",
    data: result,
  });
});

//delete booking
const deleteBooking = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await BookingService.deleteBooking(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Booking deleted successfully!",
    data: result,
  });
});

export const BookingController = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};
