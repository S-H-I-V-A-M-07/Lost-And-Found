import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      prisma: 'connected',
    },
  };

  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.checks.database = 'connected';
    healthCheck.status = 'healthy';

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    healthCheck.checks.database = 'error';
    healthCheck.checks.prisma = 'disconnected';
    healthCheck.status = 'unhealthy';

    console.error('Health check failed:', error);

    return NextResponse.json(healthCheck, { status: 503 });
  }
}

export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Health check HEAD failed:', error);
    return new NextResponse(null, { status: 503 });
  }
}