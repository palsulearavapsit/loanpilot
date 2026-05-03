import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from('loan_applications')
      .select(`
        *,
        profiles(full_name, email),
        verification_logs(event_type, status, payload, created_at),
        interview_transcripts(speaker, content, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // For each app with an image_path, generate a signed URL
    const appsWithUrls = await Promise.all(
      (data || []).map(async (app: any) => {
        if (app.image_path) {
          const { data: signed } = await adminSupabase.storage
            .from('temp-kyc')
            .createSignedUrl(app.image_path, 3600);
          return { ...app, signed_image_url: signed?.signedUrl ?? null };
        }
        return { ...app, signed_image_url: null };
      })
    );

    return NextResponse.json({ applications: appsWithUrls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { application_id, status } = await req.json();
    const { error } = await adminSupabase
      .from('loan_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', application_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
