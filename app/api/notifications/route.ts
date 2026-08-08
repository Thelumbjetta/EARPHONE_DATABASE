import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUnreadNotifications, markNotificationsAsRead } from '@/lib/reddit-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const data = await getUnreadNotifications(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/notifications] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 400 });
    }

    let body: { notification_ids?: number[] } = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty if marking all as read
    }

    await markNotificationsAsRead(userId, body.notification_ids);
    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('[POST /api/notifications] Error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
