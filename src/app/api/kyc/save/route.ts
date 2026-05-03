import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pure service-role admin client — server-side only, bypasses all RLS
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, ...payload } = body;
  const db = getAdmin();

  try {
    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { user_id, docType, ocrData } = payload;
      if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

      const { data: appRow, error: appErr } = await db
        .from('loan_applications')
        .insert({
          user_id,
          status: 'PENDING',
          purpose: 'Personal Loan',
          id_type: docType ?? null,
          id_number_last4: ocrData?.id_number ? String(ocrData.id_number).slice(-4) : null,
          decision_rationale: {
            ocr_name: ocrData?.name ?? null,
            ocr_dob: ocrData?.dob ?? null,
            doc_type: docType ?? null,
            ocr_source: 'gemini_vision',
          },
        })
        .select('id')
        .single();

      if (appErr) {
        console.error('[/api/kyc/save create] DB error:', appErr);
        return NextResponse.json({ error: appErr.message }, { status: 500 });
      }

      // Update profile name from OCR only if not already set
      if (ocrData?.name) {
        const { data: profile } = await db.from('profiles').select('full_name').eq('id', user_id).single();
        if (!profile?.full_name) {
          await db.from('profiles').update({ full_name: ocrData.name }).eq('id', user_id);
        }
      }

      return NextResponse.json({ application_id: appRow.id });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    // Stores all fields in decision_rationale JSONB so no extra columns needed.
    // Known schema columns are also updated directly where they exist.
    if (action === 'update') {
      const { application_id, fields } = payload;
      if (!application_id || !fields) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

      // Columns that exist in the schema
      const schemaColumns = ['status', 'amount', 'risk_score', 'id_type', 'id_number_last4',
        'interview_completed_at', 'id_verified_at', 'purpose', 'monthly_income', 'employment_type'];

      const directUpdate: any = { updated_at: new Date().toISOString() };
      const rationale: any = {};

      for (const [key, val] of Object.entries(fields)) {
        if (schemaColumns.includes(key)) {
          directUpdate[key] = val;
        } else {
          // geo_location, image_path, tenure, etc → store in decision_rationale
          rationale[key] = val;
        }
      }

      // Fetch current decision_rationale to merge into
      if (Object.keys(rationale).length > 0) {
        const { data: existing } = await db
          .from('loan_applications')
          .select('decision_rationale')
          .eq('id', application_id)
          .single();
        directUpdate.decision_rationale = { ...(existing?.decision_rationale ?? {}), ...rationale };
      }

      const { error } = await db.from('loan_applications').update(directUpdate).eq('id', application_id);
      if (error) {
        console.error('[/api/kyc/save update] DB error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── LOG ───────────────────────────────────────────────────────────────────
    if (action === 'log') {
      const { application_id, event_type, status, payload: logPayload } = payload;
      if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
      const { error } = await db.from('verification_logs').insert({
        application_id,
        event_type,
        status,
        payload: logPayload ?? {},
      });
      if (error) {
        console.error('[/api/kyc/save log] DB error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // ── UPLOAD_IMAGE ──────────────────────────────────────────────────────────
    if (action === 'upload_image') {
      const { application_id, user_id, file_base64, file_type, file_name } = payload;
      if (!file_base64) return NextResponse.json({ error: 'Missing file_base64' }, { status: 400 });

      const fileName = `${user_id}/${application_id}/${Date.now()}-${file_name}`;
      const buffer = Buffer.from(file_base64, 'base64');

      const { data: uploadData, error: uploadErr } = await db.storage
        .from('temp-kyc')
        .upload(fileName, buffer, { contentType: file_type ?? 'image/jpeg', upsert: true });

      if (uploadErr) {
        console.error('[/api/kyc/save upload] Storage error:', uploadErr);
        return NextResponse.json({ error: uploadErr.message }, { status: 500 });
      }

      // Store image_path inside decision_rationale (no extra column needed)
      const { data: existing } = await db.from('loan_applications').select('decision_rationale').eq('id', application_id).single();
      await db.from('loan_applications').update({
        decision_rationale: { ...(existing?.decision_rationale ?? {}), image_path: uploadData.path },
        updated_at: new Date().toISOString(),
      }).eq('id', application_id);

      return NextResponse.json({ image_path: uploadData.path });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (err: any) {
    console.error('[/api/kyc/save] Unexpected error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
