import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/notifications/:id - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const matchId = request.nextUrl.pathname.split('/').pop();

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.update({
      where: { id: matchId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: any) {
    if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }
    console.error('Failed to update notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}