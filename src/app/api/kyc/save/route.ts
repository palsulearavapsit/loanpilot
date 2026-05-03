import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS, runs server-side only
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    // ── CREATE: initial loan_applications row ──────────────────────────────
    if (action === 'create') {
      const { user_id, docType, ocrData } = payload;

      // Create loan_applications row
      const { data: appRow, error: appErr } = await adminSupabase
        .from('loan_applications')
        .insert({
          user_id,
          status: 'PENDING',
          purpose: 'Personal Loan',
          id_type: docType,
          id_number_last4: ocrData?.id_number ? String(ocrData.id_number).slice(-4) : null,
          decision_rationale: {
            ocr_name: ocrData?.name ?? null,
            ocr_dob: ocrData?.dob ?? null,
            doc_type: docType,
            ocr_source: 'gemini_vision',
          },
        })
        .select('id')
        .single();

      if (appErr || !appRow?.id) {
        return NextResponse.json({ error: appErr?.message ?? 'Failed to create row' }, { status: 500 });
      }

      // Update profile name from OCR if not already set
      if (ocrData?.name) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', user_id)
          .single();
        if (!profile?.full_name) {
          await adminSupabase.from('profiles').update({ full_name: ocrData.name }).eq('id', user_id);
        }
      }

      return NextResponse.json({ application_id: appRow.id });
    }

    // ── UPDATE: patch fields on an existing row ────────────────────────────
    if (action === 'update') {
      const { application_id, fields } = payload;
      if (!application_id || !fields) {
        return NextResponse.json({ error: 'Missing application_id or fields' }, { status: 400 });
      }
      const { error } = await adminSupabase
        .from('loan_applications')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', application_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── LOG: insert a verification_log row ─────────────────────────────────
    if (action === 'log') {
      const { application_id, event_type, status, payload: logPayload } = payload;
      const { error } = await adminSupabase.from('verification_logs').insert({
        application_id,
        event_type,
        status,
        payload: logPayload,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── UPLOAD_IMAGE: upload ID image to storage ───────────────────────────
    if (action === 'upload_image') {
      const { application_id, user_id, file_base64, file_type, file_name } = payload;
      const fileName = `${user_id}/${application_id}/${Date.now()}-${file_name}`;
      const buffer = Buffer.from(file_base64, 'base64');

      const { data: uploadData, error: uploadErr } = await adminSupabase.storage
        .from('temp-kyc')
        .upload(fileName, buffer, { contentType: file_type, upsert: true });

      if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

      // Save image_path to loan_applications
      await adminSupabase.from('loan_applications')
        .update({ image_path: uploadData.path, updated_at: new Date().toISOString() })
        .eq('id', application_id);

      return NextResponse.json({ image_path: uploadData.path });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
