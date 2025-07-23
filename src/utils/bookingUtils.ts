import { BookingStatus } from "@prisma/client";
import {
  AvailableSlot,
  BookingConflictInfo,
  BookingWithResource,
} from "../app/modules/Booking/Booking.interface";

const BUFFER_MINUTES = 10;
const MIN_BOOKING_MINUTES = 15;
const MAX_BOOKING_HOURS = 2;

export function addBufferTime(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function subtractBufferTime(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60000);
}

export function validateBookingDuration(
  startTime: Date,
  endTime: Date
): { valid: boolean; message?: string } {
  const now = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  const durationHours = durationMinutes / 60;

  if (startTime < now) {
    return { valid: false, message: "Start time must be in the future " };
  }

  if (endTime <= startTime) {
    return { valid: false, message: "End time must be after start time" };
  }

  if (durationMinutes < MIN_BOOKING_MINUTES) {
    return {
      valid: false,
      message: `Minimum booking duration is ${MIN_BOOKING_MINUTES} minutes`,
    };
  }

  if (durationHours > MAX_BOOKING_HOURS) {
    return {
      valid: false,
      message: `Maximum booking duration is ${MAX_BOOKING_HOURS} hours`,
    };
  }

  return { valid: true };
}

export function checkBookingConflicts(
  newStartTime: Date,
  newEndTime: Date,
  existingBookings: BookingWithResource[]
): BookingConflictInfo {
  const conflictingBookings: BookingWithResource[] = [];

  for (const booking of existingBookings) {
    // Add buffer time to existing bookings
    const bufferedStart = subtractBufferTime(
      new Date(booking.startTime),
      BUFFER_MINUTES
    );
    const bufferedEnd = addBufferTime(
      new Date(booking.endTime),
      BUFFER_MINUTES
    );

    // Check if new booking overlaps with buffered existing booking
    const hasOverlap = newStartTime < bufferedEnd && newEndTime > bufferedStart;

    if (hasOverlap) {
      conflictingBookings.push(booking);
    }
  }

  return {
    hasConflict: conflictingBookings.length > 0,
    conflictingBookings,
    message:
      conflictingBookings.length > 0
        ? `Conflicts with ${conflictingBookings.length} existing booking(s). Note: 10-minute buffer time is applied before and after each booking.`
        : undefined,
  };
}

export function getBookingStatus(
  startTime: Date,
  endTime: Date
): BookingStatus {
  const now = new Date();

  if (now < startTime) {
    return "upcoming";
  } else if (now >= startTime && now <= endTime) {
    return "ongoing";
  } else {
    return "past";
  }
}

export function findAvailableSlots(
  existingBookings: BookingWithResource[],
  searchDate: Date,
  minDurationMinutes: number = MIN_BOOKING_MINUTES
): AvailableSlot[] {
  const startOfDay = new Date(searchDate);
  startOfDay.setHours(8, 0, 0, 0); // 8 AM start

  const endOfDay = new Date(searchDate);
  endOfDay.setHours(20, 0, 0, 0); // 8 PM end

  // Sort bookings by start time
  const sortedBookings = existingBookings
    .filter((booking) => {
      const bookingDate = new Date(booking.startTime);
      return bookingDate.toDateString() === searchDate.toDateString();
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  const availableSlots: AvailableSlot[] = [];
  let currentTime = startOfDay;

  for (const booking of sortedBookings) {
    const bookingBufferedStart = subtractBufferTime(
      new Date(booking.startTime),
      BUFFER_MINUTES
    );

    // If there's a gap before this booking
    if (currentTime < bookingBufferedStart) {
      const slotDuration =
        (bookingBufferedStart.getTime() - currentTime.getTime()) / (1000 * 60);
      if (slotDuration >= minDurationMinutes) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(bookingBufferedStart),
          duration: Math.floor(slotDuration),
        });
      }
    }

    // Move current time to after this booking (with buffer)
    const bookingBufferedEnd = addBufferTime(
      new Date(booking.endTime),
      BUFFER_MINUTES
    );
    currentTime = new Date(
      Math.max(currentTime.getTime(), bookingBufferedEnd.getTime())
    );
  }

  // Check if there's time available after the last booking
  if (currentTime < endOfDay) {
    const slotDuration =
      (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60);
    if (slotDuration >= minDurationMinutes) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(endOfDay),
        duration: Math.floor(slotDuration),
      });
    }
  }

  return availableSlots;
}
