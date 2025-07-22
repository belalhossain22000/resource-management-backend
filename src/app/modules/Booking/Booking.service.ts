// Booking.service: Module file for the Booking.service functionality.
import { Booking } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  checkBookingConflicts,
  getBookingStatus,
  validateBookingDuration,
} from "../../../utils/bookingUtils";
import { BookingWithStatus } from "./Booking.interface";

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

//get all bookings
const getAllBookings = async (payload: any) => {
  const { resource, date } = payload;
  const whereClause: any = {};

  if (resource) {
    whereClause.resourceId = resource;
  }

  if (date) {
    const searchDate = new Date(date as string);
    if (isNaN(searchDate.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
    }

    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    whereClause.startTime = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      resource: true,
    },
    orderBy: [{ startTime: "asc" }],
  });

  const bookingsWithStatus: BookingWithStatus[] = bookings.map((booking) => ({
    ...booking,
    status: getBookingStatus(
      new Date(booking.startTime),
      new Date(booking.endTime)
    ),
  }));

  const groupedBookings = bookingsWithStatus.reduce((acc, booking) => {
    const resourceName = booking.resource.name;
    if (!acc[resourceName]) {
      acc[resourceName] = [];
    }
    acc[resourceName].push(booking);
    return acc;
  }, {} as Record<string, BookingWithStatus[]>);

  return {
    bookings: bookingsWithStatus,
    groupedBookings,
  };
};

//get single booking
const getBookingById = async (id: string) => {
  const result = await prisma.booking.findUnique({
    where: {
      id: id,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }
  return result;
};

//update booking
const updateBooking = async (id: string, payload: Booking) => {
  if (payload.resourceId) {
    const resource = await prisma.resource.findUnique({
      where: {
        id: payload.resourceId,
      },
    });
    if (!resource) {
      throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
    }
  }

  const booking = await getBookingById(id);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const result = await prisma.booking.update({
    where: {
      id: id,
    },
    data: payload,
  });
  return result;
};

//delete booking
const deleteBooking = async (id: string) => {
  const booking = await getBookingById(id);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }
  const result = await prisma.booking.delete({
    where: {
      id: id,
    },
  });
  return result;
};

export const BookingService = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};
