import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { getSignInfo } from '@/lib/hoyolab';

// GET /api/accounts - List all accounts with latest check-in
export async function GET(request) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. Fetch all accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, nickname, auto_checkin, created_at')
      .order('created_at', { ascending: true });
      
    if (accError) {
      return NextResponse.json({ error: 'Failed to fetch accounts from database', detail: accError.message }, { status: 500 });
    }
    
    if (accounts.length === 0) {
      return NextResponse.json({ accounts: [] }, { status: 200 });
    }
    
    // 2. Fetch recent checkin logs for these accounts to determine latest status
    const accountIds = accounts.map(a => a.id);
    const { data: logs, error: logsError } = await supabase
      .from('checkin_logs')
      .select('account_id, check_date, success, reward_name, reward_count, reward_icon')
      .in('account_id', accountIds)
      .order('created_at', { ascending: false });
      
    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch check-in logs', detail: logsError.message }, { status: 500 });
    }
    
    // 3. Map accounts to their latest log (since logs are ordered by created_at desc, first one seen is latest)
    const latestLogsMap = {};
    for (const log of logs || []) {
      if (!latestLogsMap[log.account_id]) {
        latestLogsMap[log.account_id] = {
          date: log.check_date,
          success: log.success,
          reward_name: log.reward_name,
          reward_count: log.reward_count,
          reward_icon: log.reward_icon
        };
      }
    }
    
    const formattedAccounts = accounts.map(acc => ({
      id: acc.id,
      nickname: acc.nickname,
      auto_checkin: acc.auto_checkin,
      created_at: acc.created_at,
      last_checkin: latestLogsMap[acc.id] || null
    }));
    
    return NextResponse.json({ accounts: formattedAccounts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}

// POST /api/accounts - Add an account
export async function POST(request) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { nickname, ltuid_v2, ltoken_v2 } = await request.json();
    
    if (!nickname || !ltuid_v2 || !ltoken_v2) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate credentials with HoYoLAB API first
    try {
      await getSignInfo(ltuid_v2, ltoken_v2);
    } catch (hError) {
      return NextResponse.json({ error: 'Invalid credentials', detail: hError.message }, { status: 400 });
    }
    
    // Encrypt credentials
    const encryptedLtuid = encrypt(ltuid_v2);
    const encryptedLtoken = encrypt(ltoken_v2);
    
    // Insert into DB
    const { data: newAccount, error: insertError } = await supabase
      .from('accounts')
      .insert([
        {
          nickname,
          ltuid_v2: encryptedLtuid,
          ltoken_v2: encryptedLtoken,
          auto_checkin: true
        }
      ])
      .select('id, nickname, auto_checkin, created_at')
      .single();
      
    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert account into database', detail: insertError.message }, { status: 500 });
    }
    
    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
