import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendMessage } from '@/lib/messages-queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const senderId = session?.user?.id ? parseInt(session.user.id, 10) : 1;
    const body = await request.json();

    const { receiver_username, content } = body;

    if (!receiver_username || !content?.trim()) {
      return NextResponse.json({ error: 'Receiver username and content are required' }, { status: 400 });
    }

    const message = await sendMessage(senderId, receiver_username.trim(), content.trim());
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('[POST /api/messages/send] Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
