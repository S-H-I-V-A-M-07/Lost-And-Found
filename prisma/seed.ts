import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for better type safety
type ItemType = 'LOST' | 'FOUND';
type ItemStatus = 'OPEN' | 'MATCHED' | 'CLAIMED' | 'CLOSED';
type MatchStatus = 'PENDING_REVIEW' | 'CONFIRMED_BY_OWNER' | 'REJECTED';
type NotificationChannel = 'IN_APP' | 'EMAIL';

interface ExtractedAttributes {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  color?: string;
  uniqueMarks?: string;
  size?: string;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (for development)
  await prisma.notification.deleteMany();
  await prisma.match.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create sample users
  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1-555-0101',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      phone: '+1-555-0102',
    },
  });

  console.log(`👤 Created users: ${user1.name}, ${user2.name}`);

  // Create extracted attributes JSON
  const laptopAttributes: ExtractedAttributes = {
    category: 'Electronics',
    subcategory: 'Laptop',
    brand: 'Apple',
    model: 'MacBook Pro 16"',
    color: 'Space Gray',
    uniqueMarks: 'Small scratch on bottom right corner, Apple sticker on lid',
  };

  // Create a LOST item (Alice lost her laptop)
  const lostItem = await prisma.item.create({
    data: {
      userId: user1.id,
      type: 'LOST' as ItemType,
      title: 'MacBook Pro 16" - Space Gray',
      description: 'Lost my MacBook Pro 16-inch in Space Gray color. Has a small scratch on the bottom right corner. Contains important work documents. Last seen in the library.',
      extractedAttributes: JSON.stringify(laptopAttributes),
      imageUrl: '/uploads/lost-macbook.jpg',
      locationName: 'University Library - 2nd Floor Study Area',
      latitude: 40.7128,
      longitude: -74.0060,
      incidentTime: new Date('2024-01-15T14:30:00Z'),
      status: 'OPEN' as ItemStatus,
    },
  });

  // Create a FOUND item (Bob found a laptop)
  const foundItem = await prisma.item.create({
    data: {
      userId: user2.id,
      type: 'FOUND' as ItemType,
      title: 'Found: MacBook Pro 16" - Space Gray',
      description: 'Found a MacBook Pro 16-inch Space Gray laptop near the library entrance. It has a scratch on the bottom right and an Apple sticker on the lid. No charger included.',
      extractedAttributes: JSON.stringify(laptopAttributes),
      imageUrl: '/uploads/found-macbook.jpg',
      locationName: 'University Library - Main Entrance',
      latitude: 40.7130,
      longitude: -74.0058,
      incidentTime: new Date('2024-01-15T16:45:00Z'),
      status: 'OPEN' as ItemStatus,
    },
  });

  console.log(`📦 Created items: ${lostItem.title} (${lostItem.type}), ${foundItem.title} (${foundItem.type})`);

  // Create a sample match (for testing)
  const match = await prisma.match.create({
    data: {
      lostItemId: lostItem.id,
      foundItemId: foundItem.id,
      imageScore: 0.92,
      descriptionScore: 0.88,
      locationScore: 0.95,
      totalScore: 0.91,
      matchReason: 'High similarity across all dimensions: identical model (MacBook Pro 16" Space Gray), matching unique marks (scratch on bottom right, Apple sticker), close proximity (library 2nd floor vs main entrance ~50m), and incident time within 2 hours. Strong match candidate.',
      status: 'PENDING_REVIEW' as MatchStatus,
    },
  });

  console.log(`🔗 Created match: ${match.id} (score: ${match.totalScore})`);

  // Create sample notifications
  await prisma.notification.create({
    data: {
      userId: user1.id,
      matchId: match.id,
      title: 'Potential Match Found for Your Lost Item',
      message: 'We found a potential match for your lost MacBook Pro. A Space Gray MacBook Pro 16" was found near the library entrance with matching description.',
      channel: 'IN_APP' as NotificationChannel,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user2.id,
      matchId: match.id,
      title: 'Your Found Item Has a Potential Owner',
      message: 'The MacBook Pro you found may belong to someone who reported it lost. Please review the match details.',
      channel: 'IN_APP' as NotificationChannel,
    },
  });

  console.log('🔔 Created notifications for both users');

  // Verify counts
  const userCount = await prisma.user.count();
  const itemCount = await prisma.item.count();
  const matchCount = await prisma.match.count();
  const notificationCount = await prisma.notification.count();

  console.log('\n✅ Seed completed successfully!');
  console.log(`   Users: ${userCount}`);
  console.log(`   Items: ${itemCount}`);
  console.log(`   Matches: ${matchCount}`);
  console.log(`   Notifications: ${notificationCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });