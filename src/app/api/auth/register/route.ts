import { NextResponse } from 'next/server';

// Registration is now handled directly by Supabase on the client side
// This route is kept for backward compatibility
export async function POST() {
      return NextResponse.json(
    { 
      error: 'Registration is handled by Supabase. Please use the client-side authentication.' 
    },
        { status: 400 }
      );
}
