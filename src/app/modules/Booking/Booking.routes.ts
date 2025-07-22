// Booking.routes: Module file for the Booking.routes functionality.
import express from "express";
import { BookingController } from "./Booking.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BookingValidation } from "./Booking.validation";

const router = express.Router();

// Create booking route (POST)
router.post(
    "/create",
    validateRequest(BookingValidation.createBookingSchema),
    BookingController.createBooking
);

export const BookingRoutes = router;