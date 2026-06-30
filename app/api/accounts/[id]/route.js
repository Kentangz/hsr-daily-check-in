import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

// PATCH /api/accounts/[id] - Update account
export async function PATCH(request, { params }) {
  try {
    const session = verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { nickname, auto_checkin } = body;
    
    // Build update object
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (auto_checkin !== undefined) updateData.auto_checkin = auto_checkin;
    updateData.updated_at = new Date().toISOString();
    
    if (Object.keys(updateData).length === 1) { // only updated_at
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    // Check if account exists
    const { data: checkAccount, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError || !checkAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Perform update
    const { data: updatedAccount, error: updateError } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select('id, nickname, auto_checkin, created_at')
      .single();
      
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update account', detail: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ account: updatedAccount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(request, { params }) {
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
    const { data: checkAccount, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError || !checkAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Perform delete (cascading logs delete will happen automatically due to DB foreign key ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete account', detail: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
