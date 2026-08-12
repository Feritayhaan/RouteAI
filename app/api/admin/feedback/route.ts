import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import type { FeedbackRecord } from "@/lib/validations/feedback";

const RECENT_KEY = 'fb:recent';
const LIMIT = 100;

export async function GET(request: NextRequest) {
    const adminSecret = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    try {
        const keys = await kv.lrange(RECENT_KEY, 0, LIMIT - 1);

        if (!keys || keys.length === 0) {
            return NextResponse.json({ success: true, count: 0, feedback: [] });
        }

        // mget sirayi korur; silinmis/expire olmus anahtarlar null doner, onlari eliyoruz.
        const records = await kv.mget<(FeedbackRecord | null)[]>(...keys);
        const feedback = records.filter((r): r is FeedbackRecord => r !== null);

        return NextResponse.json({
            success: true,
            count: feedback.length,
            feedback,
        });
    } catch (error) {
        console.error('Feedback listeleme hatası:', error);
        return NextResponse.json(
            { error: 'Feedback listelenemedi' },
            { status: 500 }
        );
    }
}
