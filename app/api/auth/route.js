import { NextResponse } from 'next/server';
import { verifyPassword, createSession, verifySession, setSessionCookie, clearSessionCookie } from '@/lib/auth';

// POST /api/auth - Login
export async function POST(request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    const isValid = verifyPassword(password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    const token = createSession();
    const response = NextResponse.json({ success: true }, { status: 200 });
    return setSessionCookie(response, token);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}

// GET /api/auth - Session Check
export async function GET(request) {
  const session = verifySession(request);
  if (session.valid) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  } else {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// DELETE /api/auth - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  return clearSessionCookie(response);
}
