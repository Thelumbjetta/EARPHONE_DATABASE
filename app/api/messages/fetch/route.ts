import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getConversations, getDirectMessages } from '@/lib/messages-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id, 10) : 1;
    const { searchParams } = new URL(request.url);
    const withUser = searchParams.get('with_user');

    if (withUser) {
      const messages = await getDirectMessages(userId, withUser);
      return NextResponse.json({ messages });
    }

    const conversations = await getConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[GET /api/messages/fetch] Error:', error);
    return NextResponse.json({ conversations: [] });
  }
}
