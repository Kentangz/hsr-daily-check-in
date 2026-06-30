const BASE_URL = 'https://sg-public-api.hoyolab.com/event/luna/os';
const ACT_ID = 'e202303301540311'; // Honkai Star Rail

function buildHeaders(ltuid_v2, ltoken_v2) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer': 'https://act.hoyolab.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json'
  };
  if (ltuid_v2 && ltoken_v2) {
    headers['Cookie'] = `ltuid_v2=${ltuid_v2}; ltoken_v2=${ltoken_v2}`;
  }
  return headers;
}

export async function performCheckin(ltuid_v2, ltoken_v2) {
  const url = `${BASE_URL}/sign`;
  const headers = buildHeaders(ltuid_v2, ltoken_v2);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ act_id: ACT_ID }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: result.retcode === 0 || result.retcode === -5003,
      retcode: result.retcode,
      message: result.message || 'Unknown response',
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      retcode: -1,
      message: error.message
    };
  }
}

export async function getSignInfo(ltuid_v2, ltoken_v2) {
  const url = `${BASE_URL}/info?act_id=${ACT_ID}`;
  const headers = buildHeaders(ltuid_v2, ltoken_v2);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.retcode !== 0) {
      throw new Error(result.message || 'Failed to fetch sign info');
    }
    
    return {
      totalSignDay: result.data.total_sign_day,
      isSign: result.data.is_sign,
      today: result.data.today,
      region: result.data.region,
      signCntMissed: result.data.sign_cnt_missed
    };
  } catch (error) {
    throw new Error(`HoYoLAB Sign Info Error: ${error.message}`);
  }
}

export async function getMonthlyRewards(ltuid_v2, ltoken_v2) {
  const url = `${BASE_URL}/home?act_id=${ACT_ID}`;
  const headers = buildHeaders(ltuid_v2, ltoken_v2);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.retcode !== 0) {
      throw new Error(result.message || 'Failed to fetch monthly rewards');
    }
    
    // Map awards to standard structure: { day, name, icon, count }
    const awards = result.data.awards.map((award, index) => ({
      day: index + 1,
      name: award.name,
      icon: award.icon,
      count: award.cnt
    }));
    
    return {
      month: result.data.month || new Date().getMonth() + 1,
      rewards: awards
    };
  } catch (error) {
    throw new Error(`HoYoLAB Monthly Rewards Error: ${error.message}`);
  }
}
