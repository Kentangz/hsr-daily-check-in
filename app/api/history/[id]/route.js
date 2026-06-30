import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

// GET /api/history/[id] - Get check-in history
export async function GET(request, { params }) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }
    
    // Check if account exists
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', id)
      .single();
      
    if (accError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    let limit = 30; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 90); // max 90
      }
    }
    
    // Query logs
    const { data: logs, error: logsError } = await supabase
      .from('checkin_logs')
      .select('id, check_date, success, message, reward_name, reward_icon, reward_count, created_at')
      .eq('account_id', id)
      .order('check_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch check-in history', detail: logsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ history: logs || [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
