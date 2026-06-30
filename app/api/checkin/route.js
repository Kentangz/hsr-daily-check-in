import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { performCheckin, getSignInfo, getMonthlyRewards } from '@/lib/hoyolab';

// Helper to run checkin for a single account
async function processAccountCheckin(account) {
  const accountId = account.id;
  const nickname = account.nickname;
  
  let ltuid, ltoken;
  try {
    ltuid = decrypt(account.ltuid_v2);
    ltoken = decrypt(account.ltoken_v2);
  } catch (decError) {
    const errorMsg = 'Decryption failed (check ENCRYPTION_KEY)';
    await supabase.from('checkin_logs').insert([
      {
        account_id: accountId,
        check_date: new Date().toISOString().split('T')[0],
        success: false,
        message: errorMsg
      }
    ]);
    return {
      accountId,
      nickname,
      success: false,
      message: errorMsg
    };
  }

  // 1. Perform Check-in
  const checkinResult = await performCheckin(ltuid, ltoken);
  
  if (checkinResult.success) {
    try {
      // 2. Fetch Sign Info to get totalSignDay and today's date
      const signInfo = await getSignInfo(ltuid, ltoken);
      const checkDate = signInfo.today; // "YYYY-MM-DD" from HoYoLAB server
      
      // Check if a successful log already exists for this check_date
      const { data: existingLog } = await supabase
        .from('checkin_logs')
        .select('*')
        .eq('account_id', accountId)
        .eq('check_date', checkDate)
        .eq('success', true)
        .maybeSingle();
        
      if (existingLog) {
        return {
          accountId,
          nickname,
          success: true,
          message: checkinResult.retcode === -5003 ? 'Already checked in today' : 'OK',
          reward: {
            name: existingLog.reward_name,
            icon: existingLog.reward_icon,
            count: existingLog.reward_count
          }
        };
      }
      
      // 3. Fetch Monthly Rewards to find this day's reward
      const rewardsResult = await getMonthlyRewards(ltuid, ltoken);
      const reward = rewardsResult.rewards.find(r => r.day === signInfo.totalSignDay) || null;
      
      const message = checkinResult.retcode === -5003 ? 'Already checked in today' : 'OK';
      
      // 4. Log successful check-in
      await supabase.from('checkin_logs').insert([
        {
          account_id: accountId,
          check_date: checkDate,
          success: true,
          message,
          reward_name: reward ? reward.name : null,
          reward_icon: reward ? reward.icon : null,
          reward_count: reward ? reward.count : null
        }
      ]);
      
      return {
        accountId,
        nickname,
        success: true,
        message,
        reward: reward ? {
          name: reward.name,
          icon: reward.icon,
          count: reward.count
        } : null
      };
    } catch (hError) {
      // If sign info or reward fetching fails, still log a partial success
      const fallbackDate = new Date().toISOString().split('T')[0];
      await supabase.from('checkin_logs').insert([
        {
          account_id: accountId,
          check_date: fallbackDate,
          success: true,
          message: `Check-in OK, but metadata fetch failed: ${hError.message}`
        }
      ]);
      
      return {
        accountId,
        nickname,
        success: true,
        message: 'OK (metadata fetch failed)'
      };
    }
  } else {
    // Check-in failed
    const checkDate = new Date().toISOString().split('T')[0];
    await supabase.from('checkin_logs').insert([
      {
        account_id: accountId,
        check_date: checkDate,
        success: false,
        message: checkinResult.message
      }
    ]);
    
    return {
      accountId,
      nickname,
      success: false,
      message: checkinResult.message
    };
  }
}

// POST /api/checkin - Manual check-in (single/all)
export async function POST(request) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }
    
    let accountsToProcess = [];
    
    if (accountId === 'all') {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('auto_checkin', true);
        
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch accounts', detail: error.message }, { status: 500 });
      }
      accountsToProcess = accounts || [];
    } else {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();
        
      if (error || !account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      accountsToProcess = [account];
    }
    
    if (accountsToProcess.length === 0) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }
    
    // Run checkins in parallel
    const rawResults = await Promise.allSettled(
      accountsToProcess.map(acc => processAccountCheckin(acc))
    );
    const results = rawResults.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        return {
          accountId: accountsToProcess[index].id,
          nickname: accountsToProcess[index].nickname,
          success: false,
          message: `Internal error: ${res.reason?.message || 'Unknown reason'}`
        };
      }
    });
    
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
