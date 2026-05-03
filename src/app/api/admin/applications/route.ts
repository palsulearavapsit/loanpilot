import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const db = getAdmin();

    // Fetch all applications with profiles
    const { data: apps, error } = await db
      .from('loan_applications')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin/applications] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each app, fetch logs + transcripts + generate signed image URL
    const enriched = await Promise.all(
      (apps || []).map(async (app: any) => {
        const [logsRes, transcriptsRes] = await Promise.all([
          db.from('verification_logs').select('*').eq('application_id', app.id).order('created_at', { ascending: true }),
          db.from('interview_transcripts').select('*').eq('application_id', app.id).order('created_at', { ascending: true }),
        ]);

        // image_path stored in decision_rationale.image_path (no extra column)
        const imagePath = app.decision_rationale?.image_path ?? null;
        let signedImageUrl: string | null = null;
        if (imagePath) {
          const { data: signed } = await db.storage.from('temp-kyc').createSignedUrl(imagePath, 3600);
          signedImageUrl = signed?.signedUrl ?? null;
        }

        return {
          ...app,
          // Flatten commonly-needed decision_rationale fields for easy admin display
          ocr_name: app.decision_rationale?.ocr_name ?? null,
          ocr_dob: app.decision_rationale?.ocr_dob ?? null,
          geo_location: app.decision_rationale?.geo_location ?? null,
          image_path: imagePath,
          signed_image_url: signedImageUrl,
          verification_logs: logsRes.data ?? [],
          interview_transcripts: transcriptsRes.data ?? [],
        };
      })
    );

    return NextResponse.json({ applications: enriched });
  } catch (err: any) {
    console.error('[GET /api/admin/applications] Unexpected error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const db = getAdmin();
    const { application_id, status } = await req.json();
    if (!application_id || !status) {
      return NextResponse.json({ error: 'Missing application_id or status' }, { status: 400 });
    }
    const { error } = await db
      .from('loan_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', application_id);

    if (error) {
      console.error('[PATCH /api/admin/applications] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[PATCH /api/admin/applications] Unexpected error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
