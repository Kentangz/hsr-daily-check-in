import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { getSignInfo } from '@/lib/hoyolab';

// GET /api/status/[id] - Get account check-in status from HoYoLAB
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
    
    // Fetch account from DB
    const { data: account, error: dbError } = await supabase
      .from('accounts')
      .select('ltuid_v2, ltoken_v2')
      .eq('id', id)
      .single();
      
    if (dbError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    let ltuid, ltoken;
    try {
      ltuid = decrypt(account.ltuid_v2);
      ltoken = decrypt(account.ltoken_v2);
    } catch (decError) {
      return NextResponse.json({ error: 'Decryption failed', detail: decError.message }, { status: 500 });
    }
    
    // Call HoYoLAB
    try {
      const signInfo = await getSignInfo(ltuid, ltoken);
      return NextResponse.json({
        total_sign_day: signInfo.totalSignDay,
        today: signInfo.today,
        is_sign: signInfo.isSign,
        is_sub: signInfo.isSub || false,
        region: signInfo.region
      }, { status: 200 });
    } catch (hError) {
      console.error(`HoYoLAB Status API Error for account ${id}:`, hError);
      return NextResponse.json({ error: 'HoYoLAB API error', detail: hError.message }, { status: 502 });
    }
  } catch (error) {
    console.error(`Internal server error in GET /api/status/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
