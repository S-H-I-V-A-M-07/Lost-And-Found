import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractItemDetails } from '@/lib/ai/extractItemDetails';
import type { ItemType, ExtractedAttributes } from '@/lib/ai/extractItemDetails';

// Type definitions
type ItemStatus = 'OPEN' | 'MATCHED' | 'CLAIMED' | 'CLOSED';

// GET /api/items - List all items with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: {
      type?: string;
      status?: string;
      userId?: string;
    } = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const items = await prisma.item.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        description: true,
        extractedAttributes: true,
        imageUrl: true,
        locationName: true,
        latitude: true,
        longitude: true,
        incidentTime: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        incidentTime: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST /api/items - Create a new item with AI extraction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      title,
      description,
      imageUrl,
      locationName,
      latitude,
      longitude,
      incidentTime,
    } = body;

    // Validate required fields
    if (!userId || !type || !title || !description || !locationName || !incidentTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, type, title, description, locationName, incidentTime',
        },
        { status: 400 }
      );
    }

    if (type !== 'LOST' && type !== 'FOUND') {
      return NextResponse.json(
        { success: false, error: 'type must be either "LOST" or "FOUND"' },
        { status: 400 }
      );
    }

    // Verify user exists first
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Extract attributes using AI (with fallback)
    const extractionResult = await extractItemDetails(title, description, type as ItemType);

    const item = await prisma.item.create({
      data: {
        userId,
        type: type as ItemType,
        title,
        description,
        extractedAttributes: JSON.stringify(extractionResult.extractedAttributes),
        visualSummary: extractionResult.visualSummary,
        imageUrl,
        locationName,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        incidentTime: new Date(incidentTime),
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
      extraction: extractionResult.extractedAttributes
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create item:', error);

    // Check for Prisma constraint errors - SQLite and PostgreSQL both throw different codes
    if (error.code === 'P2003' ||
        error.message?.includes('Foreign key constraint') ||
        error.message?.includes('constraint failed')) {
      return NextResponse.json(
        { success: false, error: 'Referenced user does not exist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create item' },
      { status: 500 }
    );
  }
}