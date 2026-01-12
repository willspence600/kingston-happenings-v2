-- ============================================================
-- Create Tables for Kingston Happenings (PostgreSQL)
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================

-- CreateTable: Venue
CREATE TABLE IF NOT EXISTS "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "website" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "promotionTier" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: Event
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "price" TEXT,
    "ticketUrl" TEXT,
    "imageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER,
    "venueId" TEXT NOT NULL,
    "submittedById" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "recurrenceDay" INTEGER,
    "recurrenceEndDate" TEXT,
    "parentEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: EventCategory
CREATE TABLE IF NOT EXISTS "EventCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Like
CREATE TABLE IF NOT EXISTS "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "Like_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: User (Note: This is for legacy support, but actual users are in Supabase auth)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "venueName" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventCategory_eventId_name_key" ON "EventCategory"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_eventId_key" ON "Like"("userId", "eventId");

-- ============================================================
-- Done! You should now see these tables in Table Editor:
-- - Venue
-- - Event
-- - EventCategory
-- - Like
-- - User
-- ============================================================

