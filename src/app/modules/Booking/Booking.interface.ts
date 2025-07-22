// Booking.interface: Module file for the Booking.interface functionality.
import {  Booking, Resource } from '@prisma/client'

export interface BookingWithResource extends Booking {
  resource: Resource
}

export interface CreateBookingRequest {
  resourceId: string
  startTime: string // ISO string
  endTime: string   // ISO string
  requestedBy: string
}

export interface BookingConflictInfo {
  hasConflict: boolean
  conflictingBookings: BookingWithResource[]
  message?: string
}

export interface GetBookingsQuery {
  resource?: string
  date?: string // YYYY-MM-DD format
}

export type BookingStatus = 'upcoming' | 'ongoing' | 'past'

export interface BookingWithStatus extends BookingWithResource {
  status: BookingStatus
}

export interface AvailableSlot {
  start: Date
  end: Date
  duration: number // in minutes
}