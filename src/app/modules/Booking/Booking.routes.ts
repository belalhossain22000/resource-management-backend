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

//getBookingStats
router.get("/stats", BookingController.getBookingStats);

//getUpcomingAndActiveBookings
router.get("/upcoming-ongoing", BookingController.getUpcomingAndActiveBookings);

// Get all bookings route (GET)
router.get("/", BookingController.getAllBookings);

// Get booking by ID route (GET)
router.get("/:id", BookingController.getBookingById);

// Update booking route (PUT)
router.put(
    "/:id",
    validateRequest(BookingValidation.updateBookingSchema),
    BookingController.updateBooking
);

// Delete booking route (DELETE)
router.delete("/:id", BookingController.deleteBooking);

export const BookingRoutes = router;