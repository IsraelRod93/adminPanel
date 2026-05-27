import { NextResponse } from 'next/server';
import { getXposedDb } from '@/lib/xposed-db';
import { verifyAdminSession } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getXposedDb();

  try {
    const userStatsRows = (await sql`
      SELECT
        COUNT(*)::int                                                                    AS total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int             AS users_this_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int              AS users_today,
        COALESCE(SUM(stars), 0)::int                                                    AS total_stars_circulation,
        COALESCE(AVG(stars), 0)::numeric(10,2)                                          AS avg_stars,
        COUNT(*) FILTER (WHERE streak_count > 0)::int                                   AS active_streaks
      FROM users
    `) as Row[];

    const msgStatsRows = (await sql`
      SELECT
        COUNT(*)::int                                                                    AS total_messages,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int             AS messages_this_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int              AS messages_today,
        COUNT(*) FILTER (WHERE is_clue_revealed = true)::int                            AS revealed_count,
        COUNT(*) FILTER (WHERE is_clue_revealed = false)::int                           AS unrevealed_count
      FROM messages
    `) as Row[];

    const txStatsRows = (await sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int                         AS stars_earned,
        COALESCE(ABS(SUM(amount) FILTER (WHERE amount < 0)), 0)::int                    AS stars_spent,
        COUNT(*) FILTER (WHERE type = 'reveal')::int                                    AS reveals_count,
        COUNT(*) FILTER (WHERE type = 'mission_reward')::int                            AS missions_count,
        COUNT(*) FILTER (WHERE type = 'purchase')::int                                  AS purchases_count
      FROM transactions
    `) as Row[];

    const dailyMessages = (await sql`
      SELECT
        created_at::date AS day,
        COUNT(*)::int    AS count
      FROM messages
      WHERE created_at > NOW() - INTERVAL '8 days'
      GROUP BY day
      ORDER BY day
    `) as Row[];

    const topCountries = (await sql`
      SELECT
        COALESCE(sender_country, 'Unknown') AS country,
        COUNT(*)::int                        AS count
      FROM messages
      GROUP BY sender_country
      ORDER BY count DESC
      LIMIT 10
    `) as Row[];

    const topReceivers = (await sql`
      SELECT
        u.username,
        u.telegram_id,
        u.stars,
        u.streak_count,
        COUNT(m.id)::int AS message_count
      FROM users u
      LEFT JOIN messages m ON m.receiver_id = u.telegram_id
      GROUP BY u.telegram_id, u.username, u.stars, u.streak_count
      ORDER BY message_count DESC
      LIMIT 8
    `) as Row[];

    const userStats  = userStatsRows[0]  ?? {};
    const msgStats   = msgStatsRows[0]   ?? {};
    const txStats    = txStatsRows[0]    ?? {};

    return NextResponse.json({
      ...userStats,
      ...msgStats,
      ...txStats,
      daily_messages: dailyMessages,
      top_countries:  topCountries,
      top_receivers:  topReceivers,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
