import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { getMonthlyRewards } from '@/lib/hoyolab';

// GET /api/rewards - Get monthly rewards list
export async function GET(request) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch the first account to get cookies for request
    const { data: firstAccount, error: dbError } = await supabase
      .from('accounts')
      .select('ltuid_v2, ltoken_v2')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
      
    if (dbError) {
      return NextResponse.json({ error: 'Failed to query database', detail: dbError.message }, { status: 500 });
    }
    
    if (!firstAccount) {
      return NextResponse.json({ error: 'No accounts available. Please add at least one account first.' }, { status: 400 });
    }
    
    let ltuid, ltoken;
    try {
      ltuid = decrypt(firstAccount.ltuid_v2);
      ltoken = decrypt(firstAccount.ltoken_v2);
    } catch (decError) {
      return NextResponse.json({ error: 'Decryption failed', detail: decError.message }, { status: 500 });
    }
    
    // Call HoYoLAB
    try {
      const rewardsResult = await getMonthlyRewards(ltuid, ltoken);
      
      // Determine month string "YYYY-MM"
      const date = new Date();
      const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      return NextResponse.json({
        month: monthLabel,
        rewards: rewardsResult.rewards
      }, { status: 200 });
    } catch (hError) {
      return NextResponse.json({ error: 'HoYoLAB API error', detail: hError.message }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
