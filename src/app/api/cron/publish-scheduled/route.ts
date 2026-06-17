import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { publishInstagramMedia, type SocialAccountRecord } from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handlePublishCron(request);
}

export async function POST(request: Request) {
  return handlePublishCron(request);
}

async function handlePublishCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const database = getDatabase();
  const claimedPosts = await database.query(
    `with due_posts as (
       select id
       from scheduled_posts
       where status = 'pending'
         and scheduled_for <= now()
       order by scheduled_for asc
       limit 5
       for update skip locked
     )
     update scheduled_posts sp
     set status = 'publishing'
     from due_posts
     where sp.id = due_posts.id
     returning sp.id, sp.caption, sp.media_urls, sp.social_account_id`,
    []
  );
  const results = [];

  for (const scheduledPost of claimedPosts.rows) {
    try {
      const accountResult = await database.query(
        `select id, auth_flow, instagram_business_account_id, access_token_encrypted
         from social_accounts
         where id = $1 and status = 'connected'`,
        [scheduledPost.social_account_id]
      );

      if (accountResult.rowCount === 0) {
        throw new Error("Conta social desconectada.");
      }

      const publishResult = await publishInstagramMedia({
        account: accountResult.rows[0] as SocialAccountRecord,
        caption: scheduledPost.caption,
        mediaUrls: scheduledPost.media_urls || []
      });

      await database.query(
        `update scheduled_posts
         set status = 'published',
             provider_media_id = $2,
             error_message = null
         where id = $1`,
        [scheduledPost.id, publishResult.id]
      );

      results.push({ id: scheduledPost.id, status: "published" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao publicar post.";

      await database.query(
        `update scheduled_posts
         set status = 'failed',
             error_message = $2
         where id = $1`,
        [scheduledPost.id, message]
      );

      results.push({ error: message, id: scheduledPost.id, status: "failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
