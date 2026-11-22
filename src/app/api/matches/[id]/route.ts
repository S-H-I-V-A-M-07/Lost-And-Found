import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/matches/:id - Update match status
export async function PUT(request: NextRequest) {
  try {
    const matchId = request.nextUrl.pathname.split('/').pop();

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING_REVIEW', 'CONFIRMED_BY_OWNER', 'REJECTED'];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: { status },
      include: {
        lostItem: true,
        foundItem: true,
      },
    });

    // If confirmed, update item statuses
    if (status === 'CONFIRMED_BY_OWNER') {
      await prisma.item.update({
        where: { id: match.lostItemId },
        data: { status: 'CLAIMED' },
      });
      await prisma.item.update({
        where: { id: match.foundItemId },
        data: { status: 'CLAIMED' },
      });
    }

    return NextResponse.json({ success: true, data: match });
  } catch (error: any) {
    if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }
    console.error('Failed to update match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match' },
      { status: 500 }
    );
  }
}