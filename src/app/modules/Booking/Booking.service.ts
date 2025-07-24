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
import { BookingStatusUpdate, BookingWithStatus } from "./Booking.interface";
import cron from 'node-cron'

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

//!get all bookings
const getAllBookings = async (payload: any) => {
  const { resource, date, page = 1, limit = 10, searchTerm } = payload;

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

  if (searchTerm) {
    whereClause.requestedBy = {
      contains: searchTerm,
      mode: "insensitive",
    };
  }



  const [bookings] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: { resource: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.count({ where: whereClause }),
  ]);

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

  return groupedBookings;
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
        // startTime: {
        //   lte: now,
        // },
        // endTime: {
        //   gte: now,
        // },
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
        // startTime: { lte: now },
        // endTime: { gte: now },
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

// Get booking status based on current time vs booking time
const getStatusByTime = (startTime: Date, endTime: Date): BookingStatus => {
  const now = new Date()
  
  if (now < startTime) {
    return BookingStatus.upcoming
  } else if (now >= startTime && now <= endTime) {
    return BookingStatus.ongoing
  } else {
    return BookingStatus.past
  }
}

//Determine if status should be updated based on business rules
const shouldUpdateStatus = (currentStatus: BookingStatus, timeBasedStatus: BookingStatus): boolean => {
  // Never update cancelled bookings
  if (currentStatus === BookingStatus.cancelled) {
    return false
  }

  // Allow natural progression: upcoming → ongoing → past
  switch (currentStatus) {
    case BookingStatus.upcoming:
      return timeBasedStatus === BookingStatus.ongoing || timeBasedStatus === BookingStatus.past
    
    case BookingStatus.ongoing:
      return timeBasedStatus === BookingStatus.past
    
    case BookingStatus.past:
      return false // Past bookings don't change automatically
    
    default:
      return false
  }
}

 const updateBookingStatuses = async (): Promise<BookingStatusUpdate[]> => {
  const updates: BookingStatusUpdate[] = []

  try {
    console.log('Starting automatic booking status update...')

    // Get all bookings that are not cancelled
    const bookings = await prisma.booking.findMany({
      where: {
        status: {
          not: BookingStatus.cancelled
        }
      },
      include: {
        resource: true
      }
    })

    console.log(`Found ${bookings.length} non-cancelled bookings to check`)

    for (const booking of bookings) {
      const currentDbStatus = booking.status
      const timeBasedStatus = getStatusByTime(
        new Date(booking.startTime),
        new Date(booking.endTime)
      )

      // Only update if the time-based status is different and update is allowed
      if (currentDbStatus !== timeBasedStatus && shouldUpdateStatus(currentDbStatus, timeBasedStatus)) {
        try {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: timeBasedStatus,
              updatedAt: new Date()
            }
          })

          updates.push({
            id: booking.id,
            oldStatus: currentDbStatus,
            newStatus: timeBasedStatus,
            reason: `Time-based update: ${currentDbStatus} → ${timeBasedStatus}`
          })

          console.log(
            `Updated booking ${booking.id} (${booking.resource.name}): ${currentDbStatus} → ${timeBasedStatus}`
          )
        } catch (error) {
          console.error(`Failed to update booking ${booking.id}:`, error)
        }
      }
    }

    console.log(`Completed booking status update. Updated ${updates.length} bookings`)
    return updates

  } catch (error) {
    console.error('Error during booking status update:', error)
    throw error
  }
}


 //Update overdue bookings (upcoming bookings that should have started)
 
 const updateOverdueBookings = async (): Promise<BookingStatusUpdate[]> => {
  const updates: BookingStatusUpdate[] = []
  const now = new Date()

  try {
    // Find upcoming bookings where start time has passed
    const overdueBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.upcoming,
        startTime: {
          lt: now
        }
      },
      include: {
        resource: true
      }
    })

    console.log(`Found ${overdueBookings.length} overdue bookings`)

    for (const booking of overdueBookings) {
      const timeBasedStatus = getStatusByTime(
        new Date(booking.startTime),
        new Date(booking.endTime)
      )

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: timeBasedStatus,
          updatedAt: new Date()
        }
      })

      updates.push({
        id: booking.id,
        oldStatus: BookingStatus.upcoming,
        newStatus: timeBasedStatus,
        reason: `Overdue booking update`
      })

      console.log(
        `Updated overdue booking ${booking.id} (${booking.resource.name}): upcoming → ${timeBasedStatus}`
      )
    }

    return updates
  } catch (error) {
    console.error('Error updating overdue bookings:', error)
    throw error
  }
}


const updateExpiredBookings = async (): Promise<BookingStatusUpdate[]> => {
  const updates: BookingStatusUpdate[] = []
  const now = new Date()

  try {
    // Find ongoing bookings where end time has passed
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.ongoing,
        endTime: {
          lt: now
        }
      },
      include: {
        resource: true
      }
    })

    console.log(`Found ${expiredBookings.length} expired bookings`)

    for (const booking of expiredBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.past,
          updatedAt: new Date()
        }
      })

      updates.push({
        id: booking.id,
        oldStatus: BookingStatus.ongoing,
        newStatus: BookingStatus.past,
        reason: `Expired booking update`
      })

      console.log(
        `Updated expired booking ${booking.id} (${booking.resource.name}): ongoing → past`
      )
    }

    return updates
  } catch (error) {
    console.error('Error updating expired bookings:', error)
    throw error
  }
}


 //Start cron jobs for automatic booking status updates

export const startBookingCronJobs = () => {
  console.log('Starting booking status cron jobs...')

  // Run every minute to check for status updates
  cron.schedule('* * * * *', async () => {
    try {
      await updateBookingStatuses()
    } catch (error) {
      console.error('Cron job error (status update):', error)
    }
  }, {
    name: 'booking-status-update',
    timezone: 'UTC'
  })

  // Run every 5 minutes for overdue bookings
  cron.schedule('*/5 * * * *', async () => {
    try {
      await updateOverdueBookings()
    } catch (error) {
      console.error('Cron job error (overdue bookings):', error)
    }
  }, {
    name: 'overdue-bookings-update',
    timezone: 'UTC'
  })

  // Run every 10 minutes for expired bookings
  cron.schedule('*/10 * * * *', async () => {
    try {
      await updateExpiredBookings()
    } catch (error) {
      console.error('Cron job error (expired bookings):', error)
    }
  }, {
    name: 'expired-bookings-update',
    timezone: 'UTC'
  })

  // Daily stats logging at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const stats = await getBookingStats()
      console.log('Daily booking stats:', stats)
    } catch (error) {
      console.error('Daily stats cron job error:', error)
    }
  }, {
    name: 'daily-booking-stats',
    timezone: 'UTC'
  })

  console.log('All booking status cron jobs started successfully')
}

export const BookingService = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getUpcomingAndActiveBookings,
};
