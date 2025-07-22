// Booking.service: Module file for the Booking.service functionality.
import { Booking } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  checkBookingConflicts,
  validateBookingDuration,
} from "../../../utils/bookingUtils";

const createBooking = async (payload: Booking) => {
  const { resourceId, startTime, endTime, requestedBy } = payload;

  // Validate required fields
  if (!resourceId || !startTime || !endTime || !requestedBy) {
    throw new ApiError(httpStatus.BAD_REQUEST, "All fields are required");
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // Validate booking duration
  const durationValidation = validateBookingDuration(startDate, endDate);
  if (!durationValidation.valid) {
    throw new ApiError(httpStatus.BAD_REQUEST, durationValidation.message);
  }

  // Check if resource exists
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
  }

  // Get existing bookings for the same resource
  const existingBookings = await prisma.booking.findMany({
    where: {
      resourceId,
      OR: [
        {
          startTime: {
            lte: endDate,
          },
          endTime: {
            gte: startDate,
          },
        },
      ],
    },
    include: {
      resource: true,
    },
  });

  // Check for conflicts with buffer time
  const conflictCheck = checkBookingConflicts(
    startDate,
    endDate,
    existingBookings
  );

  if (conflictCheck.hasConflict) {
    throw new ApiError(httpStatus.BAD_REQUEST, conflictCheck.message);
  }

  const result = await prisma.booking.create({
    data: payload,
  });
  return result;
};

export const BookingService = {
  createBooking,
};
