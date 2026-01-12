import { NextResponse } from 'next/server';

// Logout is now handled directly by Supabase on the client side
// This route is kept for backward compatibility
export async function POST() {
    return NextResponse.json({ success: true });
}
