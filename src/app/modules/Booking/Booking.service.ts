// Booking.service: Module file for the Booking.service functionality.
import { Booking, BookingStatus } from "@prisma/client";
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
    include: {
      resource: true,
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

  // Ensure only status is being updated
  if (!payload.status || Object.keys(payload).length > 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Only status update is allowed");
  }

  const statusOrder: BookingStatus[] = ["upcoming", "ongoing", "past"];
  const currentIndex = statusOrder.indexOf(booking.status);
  const newIndex = statusOrder.indexOf(payload.status);

  // Allow "cancelled" from any state
  if (payload.status === "cancelled") {
    return await prisma.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });
  }

  // Block invalid or out-of-sequence transitions
  if (newIndex === -1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status");
  }

  if (newIndex <= currentIndex) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot revert or repeat the same status"
    );
  }

  if (newIndex !== currentIndex + 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Status must be updated sequentially"
    );
  }

  return await prisma.booking.update({
    where: { id },
    data: { status: payload.status },
  });
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

// get booking stats
const getBookingStats = async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const [
    totalBookings,
    totalResources,
    totalBookingsToday,
    ongoingBookingsToday,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.resource.count(),
    prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
    prisma.booking.count({
      where: {
        startTime: {
          lte: now,
        },
        endTime: {
          gte: now,
        },
        status: "ongoing",
      },
    }),
  ]);

  return {
    totalBookings,
    totalResources,
    totalBookingsToday,
    ongoingBookingsToday,
  };
};

//getUpcomingAndActiveBookings

const getUpcomingAndActiveBookings = async () => {
  const now = new Date();

  const [upcomingBookings, activeBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "upcoming",
      },
      orderBy: {
        startTime: "asc",
      },
      include: {
        resource: true,
      },
    }),

    prisma.booking.findMany({
      where: {
        status: "ongoing",
        startTime: { lte: now },
        endTime: { gte: now },
      },
      orderBy: {
        startTime: "asc",
      },
      include: {
        resource: true,
      },
    }),
  ]);

  return {
    upcomingBookings,
    activeBookings,
  };
};

export const BookingService = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getUpcomingAndActiveBookings,
};
