import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { performCheckin, getSignInfo, getMonthlyRewards } from '@/lib/hoyolab';

// Helper for check-in execution with exponential backoff retry (up to 3 retries)
async function cronCheckinWithRetry(account) {
  const accountId = account.id;
  const nickname = account.nickname;

  // Add random initial jitter (1s - 15s) to prevent simultaneous bot signature requests
  const jitter = Math.floor(Math.random() * 14000) + 1000;
  await new Promise(resolve => setTimeout(resolve, jitter));
  
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

  let attempt = 0;
  const maxAttempts = 4; // 1 initial + 3 retries
  let checkinResult;

  while (attempt < maxAttempts) {
    attempt++;
    checkinResult = await performCheckin(ltuid, ltoken);
    
    if (checkinResult.success) {
      break; // Succeeded (either checked in now, or already checked in today)
    }
    
    // Check if error is retryable (retcode === -1 implies transport, timeout, or HTTP error)
    const isRetryable = checkinResult.retcode === -1;
    if (!isRetryable || attempt >= maxAttempts) {
      break; // Break loop if not retryable or max attempts reached
    }
    
    // Exponential backoff: 2^(attempt - 1) * 1000 ms (1s, 2s, 4s)
    const delay = Math.pow(2, attempt - 1) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 3. Process checkin result
  if (checkinResult.success) {
    try {
      const signInfo = await getSignInfo(ltuid, ltoken);
      const checkDate = signInfo.today; // "YYYY-MM-DD" from HoYoLAB server
      
      // Check if successful log already exists
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
      
      // Fetch monthly rewards to find the current reward
      const rewardsResult = await getMonthlyRewards(ltuid, ltoken);
      const reward = rewardsResult.rewards.find(r => r.day === signInfo.totalSignDay) || null;
      
      const message = checkinResult.retcode === -5003 ? 'Already checked in today' : 'OK';
      
      // Log successful check-in
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
    // Succeeded checkin failed after all retries
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

// GET /api/cron - Cron invocation
export async function GET(request) {
  try {
    // Verify CRON_SECRET auth
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch all accounts with auto_checkin enabled
    const { data: accounts, error: dbError } = await supabase
      .from('accounts')
      .select('*')
      .eq('auto_checkin', true);
      
    if (dbError) {
      return NextResponse.json({ error: 'Failed to fetch active accounts', detail: dbError.message }, { status: 500 });
    }
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        processed: 0,
        success: 0,
        failed: 0,
        results: []
      }, { status: 200 });
    }
    
    // Execute all check-ins in parallel using Promise.all
    const runPromises = accounts.map(acc => cronCheckinWithRetry(acc));
    const rawResults = await Promise.allSettled(runPromises);
    
    const results = rawResults.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        return {
          accountId: accounts[index].id,
          nickname: accounts[index].nickname,
          success: false,
          message: `Internal error: ${res.reason?.message || 'Unknown reason'}`
        };
      }
    });
    
    const processed = results.length;
    const success = results.filter(r => r.success).length;
    const failed = processed - success;
    
    return NextResponse.json({
      processed,
      success,
      failed,
      results
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
