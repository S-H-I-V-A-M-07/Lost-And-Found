import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  calculateMatch,
  findAndSaveMatchesForItem,
  runBatchMatching
} from '@/lib/matching/matchingEngine';

// GET /api/matches - List matches with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const itemId = searchParams.get('itemId');
    const status = searchParams.get('status');
    const minScore = parseFloat(searchParams.get('minScore') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (userId) {
      // Find matches where user is the owner of either lost or found item
      where.OR = [
        { lostItem: { userId } },
        { foundItem: { userId } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (minScore > 0) {
      where.totalScore = { gte: minScore };
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        lostItem: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            extractedAttributes: true,
            imageUrl: true,
            locationName: true,
            incidentTime: true,
            status: true,
          },
        },
        foundItem: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            extractedAttributes: true,
            imageUrl: true,
            locationName: true,
            incidentTime: true,
            status: true,
          },
        },
        notifications: {
          take: 1,
          select: {
            id: true,
            isRead: true,
          },
        },
      },
      orderBy: {
        totalScore: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ success: true, data: matches });
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

// POST /api/matches/run - Run matching across items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId } = body;

    let result;

    if (itemId) {
      // Run matching for specific item
      result = await findAndSaveMatchesForItem(itemId);
    } else {
      // Run batch matching for all open items
      result = {
        matchesFound: 0,
        newMatches: [],
      };
      const batchResult = await runBatchMatching();

      // Fetch the new matches for response
      const newMatchIds = batchResult.created > 0
        ? await prisma.match.findMany({
            where: { status: 'PENDING_REVIEW' },
            orderBy: { createdAt: 'desc' },
            take: batchResult.created,
          })
        : [];

      result = {
        matchesFound: batchResult.evaluated,
        newMatches: [],
        batchSummary: batchResult,
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to run matching:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run matching' },
      { status: 500 }
    );
  }
}

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
  } catch (error) {
    console.error('Failed to update match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match' },
      { status: 500 }
    );
  }
}