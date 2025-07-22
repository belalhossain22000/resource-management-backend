# Resource Booking System

A full-stack resource booking system with conflict detection and buffer time logic built with Next.js, Prisma, and SQLite.

## Features

- 📅 **Resource Booking**: Book time slots for shared resources (rooms, devices, etc.)
- ⚡ **Conflict Detection**: Prevents overlapping bookings with 10-minute buffer time
- 🔍 **Smart Validation**: Minimum 15-minute bookings, maximum 2-hour duration
- 📊 **Booking Dashboard**: View, filter, and manage all bookings
- 🗑️ **Booking Management**: Cancel/delete bookings
- 🎯 **Available Slots**: Check availability for specific dates
- 📱 **Responsive Design**: Works on desktop and mobile

## Buffer Logic Example

If Resource A is booked from **2:00 PM** to **3:00 PM**, the system blocks 10 minutes before and after:
- **Blocked time**: 1:50 PM to 3:10 PM
- **Allowed**: 11:00 AM – 1:50 PM ✅
- **Rejected**: 1:55 PM – 2:30 PM ❌ (overlaps buffer)
- **Allowed**: 3:10 PM – 5:00 PM ✅

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Icons**: Lucide React

## Quick Start

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Initialize database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Create database and tables
   npm run db:push
   
   # Seed with sample data
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get all bookings (supports ?resource=id&date=YYYY-MM-DD)
- `GET /api/bookings/[id]` - Get specific booking
- `DELETE /api/bookings/[id]` - Delete booking

### Resources
- `GET /api/resources` - Get all available resources

### Availability
- `GET /api/available-slots` - Check available time slots
  - Query params: