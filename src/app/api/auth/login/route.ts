import { NextResponse } from 'next/server';

// Login is now handled directly by Supabase on the client side
// This route is kept for backward compatibility
export async function POST() {
      return NextResponse.json(
    { 
      error: 'Login is handled by Supabase. Please use the client-side authentication.' 
    },
        { status: 400 }
      );
}
