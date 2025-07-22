// Booking.validation: Module file for the Booking.validation functionality.
import { z } from "zod";

const createBookingSchema = z.object({
  resourceId: z.string({
    required_error: "Resource ID is required",
  }),
  startTime: z.string({
    required_error: "Start time is required",
  }),
  endTime: z.string({
    required_error: "End time is required",
  }),
  requestedBy: z.string({
    required_error: "Requested by is required",
  }),
});

//update booking validation schema
const updateBookingSchema = z.object({
  resourceId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  requestedBy: z.string().optional(),
});

export const BookingValidation = {
  createBookingSchema,
  updateBookingSchema,
};
