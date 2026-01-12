#!/bin/bash

# Database Migration Script
# This script will help you run migrations to create tables in Supabase

echo "========================================="
echo "Kingston Happenings - Database Migration"
echo "========================================="
echo ""

# Check if DATABASE_URL is already set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    echo ""
    echo "Please run this command first (replace with your actual connection string):"
    echo ""
    echo 'export DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres"'
    echo ""
    echo "To get your connection string:"
    echo "1. Go to Supabase Dashboard → Settings → Database"
    echo "2. Copy the 'Transaction mode' connection string"
    echo "3. Replace [YOUR-PASSWORD] with your actual password"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL is set"
echo ""

# Navigate to webapp directory
cd "$(dirname "$0")"
echo "Current directory: $(pwd)"
echo ""

# Run migrations
echo "Running database migrations..."
echo ""

npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Migrations completed successfully!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Go to Supabase Dashboard → Table Editor"
    echo "2. You should now see: Event, Venue, EventCategory, Like, User tables"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ Migration failed"
    echo "========================================="
    echo ""
    echo "Common issues:"
    echo "- Wrong password in connection string"
    echo "- Connection string format is incorrect"
    echo "- Database is not accessible"
    echo ""
    echo "Check the error message above for details."
    echo ""
    exit 1
fi

