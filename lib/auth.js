import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'session';
const JWT_EXPIRY = '7d';

export function verifyPassword(input) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is not defined');
  }
  return input === adminPassword;
}

export function createSession() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  const payload = { role: 'admin' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifySession(request) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    
    let token = '';
    if (request && typeof request.cookies?.get === 'function') {
      token = request.cookies.get(COOKIE_NAME)?.value;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }
    
    if (!token) {
      return { valid: false };
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.role === 'admin') {
      return { valid: true, payload: decoded };
    }
    
    return { valid: false };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export function setSessionCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
  return response;
}
