/**
 * Multi-Signal AI Matching Engine
 * Compares LOST items against FOUND items using Image, Description, and Location signals
 */

import prisma from '@/lib/prisma';
import { extractItemDetails } from '@/lib/ai/extractItemDetails';
import type { Item } from '@prisma/client';

// Types
type ItemType = 'LOST' | 'FOUND';

interface ExtractedAttributes {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  color?: string;
  uniqueMarks?: string;
  size?: string;
  keywords: string[];
}

interface ScoreResult {
  score: number;
  reason: string;
}

interface MatchCalculation {
  imageScore: number;
  descriptionScore: number;
  locationScore: number;
  totalScore: number;
  matchReason: string;
}

interface MatchResult {
  id?: string;
  lostItemId: string;
  foundItemId: string;
  imageScore: number;
  descriptionScore: number;
  locationScore: number;
  totalScore: number;
  matchReason: string;
  status: string;
  createdAt?: string;
}

// For internal AI response parsing
interface VisionMatchResult {
  score: number;
  reason: string;
  imageScore?: number;
  descriptionScore?: number;
  locationScore?: number;
  totalScore?: number;
  matchReason?: string;
}

// Configuration
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || '0.65');
const EARTH_RADIUS_KM = 6371;

// ============================================================
// LOCATION SCORING
// ============================================================

/**
 * Calculate Haversine distance in kilometers between two coordinates
 */
function haversineDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Compute location similarity score (0.0 to 1.0)
 */
export async function computeLocationScore(
  lostItem: Item,
  foundItem: Item
): Promise<ScoreResult> {
  const reasons: string[] = [];

  // GPS-based scoring
  const distance = haversineDistance(
    lostItem.latitude, lostItem.longitude,
    foundItem.latitude, foundItem.longitude
  );

  let gpsScore = 0;
  let gpsReason = '';

  if (distance !== null) {
    if (distance < 0.2) {
      gpsScore = 1.0;
      gpsReason = `very close location (${distance.toFixed(2)} km)`;
    } else if (distance < 1) {
      gpsScore = 0.8;
      gpsReason = `close location (${distance.toFixed(2)} km)`;
    } else if (distance < 5) {
      gpsScore = 0.5;
      gpsReason = `moderate distance (${distance.toFixed(2)} km)`;
    } else if (distance < 20) {
      gpsScore = 0.3;
      gpsReason = `considerable distance (${distance.toFixed(2)} km)`;
    } else {
      gpsScore = 0.1;
      gpsReason = `far distance (${distance.toFixed(2)} km)`;
    }
  } else {
    gpsScore = 0.5; // Neutral when no GPS
    gpsReason = 'no GPS coordinates';
  }

  // Location name token matching
  const nameScore = computeLocationNameScore(lostItem.locationName, foundItem.locationName);
  const nameReasons = [];

  if (nameScore === 1.0) {
    nameReasons.push('identical location names');
  } else if (nameScore > 0.7) {
    nameReasons.push('similar location names');
  } else if (nameScore > 0.4) {
    nameReasons.push('related location names');
  }

  // Combine scores (weighted average)
  // GPS: 60%, Location Name: 40%
  const totalScore = (gpsScore * 0.6 + nameScore * 0.4);

  // Check incident time proximity
  const timeDiffHours = Math.abs(
    new Date(lostItem.incidentTime).getTime() -
    new Date(foundItem.incidentTime).getTime()
  ) / (1000 * 60 * 60);

  let timeBonus = 0;
  if (timeDiffHours < 2) {
    timeBonus = 0.1; // +10% for close times
    reasons.push(`incident times ${timeDiffHours.toFixed(1)}h apart`);
  } else if (timeDiffHours < 12) {
    reasons.push(`incident times ${timeDiffHours.toFixed(1)}h apart`);
  }

  const finalScore = Math.min(1.0, totalScore + timeBonus);
  reasons.push(gpsReason, ...nameReasons);

  return {
    score: finalScore,
    reason: reasons.join(', ')
  };
}

/**
 * Compute location name similarity using token overlap
 */
function computeLocationNameScore(name1: string, name2: string): number {
  const tokens1 = extractTokens(name1);
  const tokens2 = extractTokens(name2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0.5; // Neutral
  }

  const common = tokens1.filter(t => tokens2.includes(t)).length;
  const union = [...new Set([...tokens1, ...tokens2])].length;

  return union > 0 ? common / union : 0;
}

/**
 * Extract meaningful tokens from location name
 */
function extractTokens(locationName: string): string[] {
  return locationName
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['the', 'and', 'or', 'in', 'at', 'on', 'of'].includes(t));
}

// ============================================================
// DESCRIPTION SCORING
// ============================================================

/**
 * Compute description/text similarity score
 */
export async function computeDescriptionScore(
  lostItem: Item,
  foundItem: Item
): Promise<ScoreResult> {
  const reasons: string[] = [];

  // Parse extracted attributes
  const lostAttrs: ExtractedAttributes | null = lostItem.extractedAttributes
    ? JSON.parse(lostItem.extractedAttributes)
    : null;
  const foundAttrs: ExtractedAttributes | null = foundItem.extractedAttributes
    ? JSON.parse(foundItem.extractedAttributes)
    : null;

  let score = 0;
  const scoreReasons: string[] = [];

  // Category matching
  if (lostAttrs?.category && foundAttrs?.category) {
    if (lostAttrs.category === foundAttrs.category) {
      score += 0.3;
      scoreReasons.push(`same category (${lostAttrs.category})`);
    }
  }

  // Brand matching
  if (lostAttrs?.brand && foundAttrs?.brand) {
    if (lostAttrs.brand.toLowerCase() === foundAttrs.brand.toLowerCase()) {
      score += 0.25;
      scoreReasons.push(`same brand (${lostAttrs.brand})`);
    }
  }

  // Color matching
  if (lostAttrs?.color && foundAttrs?.color) {
    if (lostAttrs.color.toLowerCase() === foundAttrs.color.toLowerCase()) {
      score += 0.15;
      scoreReasons.push(`same color (${lostAttrs.color})`);
    }
  }

  // Unique marks matching
  if (lostAttrs?.uniqueMarks && foundAttrs?.uniqueMarks) {
    const lostMarks = lostAttrs.uniqueMarks.toLowerCase();
    const foundMarks = foundAttrs.uniqueMarks.toLowerCase();
    if (lostMarks === foundMarks) {
      score += 0.2;
      scoreReasons.push('matching unique marks');
    } else if (lostMarks.split(/,/).some(m => foundMarks.includes(m.trim()))) {
      score += 0.15;
      scoreReasons.push('similar unique marks');
    }
  }

  // Subcategory matching
  if (lostAttrs?.subcategory && foundAttrs?.subcategory) {
    if (lostAttrs.subcategory === foundAttrs.subcategory) {
      score += 0.1;
      scoreReasons.push(`same subcategory (${lostAttrs.subcategory})`);
    }
  }

  // Use AI semantic similarity if available
  const aiScore = await computeAISemanticSimilarity(lostItem.title + ' ' + lostItem.description,
    foundItem.title + ' ' + foundItem.description);

  if (aiScore !== null) {
    score += aiScore * 0.25; // Weight AI similarity
    if (aiScore > 0.8) {
      scoreReasons.push('high semantic similarity');
    }
  }

  const finalScore = Math.min(1.0, score);

  return {
    score: finalScore,
    reason: scoreReasons.length > 0
      ? `Similar: ${scoreReasons.join(', ')}`
      : `Basic text match: ${finalScore.toFixed(2)}`
  };
}

/**
 * AI-powered semantic similarity (with fallback)
 */
async function computeAISemanticSimilarity(text1: string, text2: string): Promise<number | null> {
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const model = process.env.AI_TEXT_MODEL || 'text-embedding-3-small';

  if (!apiKey) {
    return null; // No AI available, use fallback only
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [text1, text2],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const embeddings = data.data?.map((d: any) => d.embedding);

    if (!embeddings || embeddings.length !== 2) {
      return null;
    }

    // Cosine similarity
    const similarity = cosineSimilarity(embeddings[0], embeddings[1]);
    return similarity;

  } catch (error) {
    console.warn('AI semantic similarity failed:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================
// IMAGE SCORING
// ============================================================

/**
 * Compute visual similarity score between items
 */
export async function computeImageScore(
  lostItem: Item,
  foundItem: Item
): Promise<ScoreResult> {
  const reasons: string[] = [];

  // Check if both have images
  const hasLostImage = !!(lostItem.imageUrl && lostItem.visualSummary);
  const hasFoundImage = !!(foundItem.imageUrl && foundItem.visualSummary);

  // If no images at all, give neutral score
  if (!hasLostImage && !hasFoundImage) {
    reasons.push('neither item has image data');
    return { score: 0.5, reason: reasons.join(', ') };
  }

  // Use AI vision model if available
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const visionModel = process.env.AI_VISION_MODEL || 'gpt-4-vision-preview';

  if (apiKey && lostItem.imageUrl && foundItem.imageUrl) {
    try {
      const aiScore = await callVisionModelForMatch(
        lostItem.imageUrl,
        foundItem.imageUrl,
        lostItem.visualSummary || '',
        foundItem.visualSummary || ''
      );

      if (aiScore !== null) {
        const visionScore = aiScore.totalScore || 0;
        reasons.push(`AI vision match: ${visionScore}`);
        return {
          score: visionScore,
          reason: aiScore.matchReason || 'AI visual comparison'
        };
      }
    } catch (error) {
      console.warn('AI vision matching failed:', error);
    }
  }

  // Fallback: compare visual summaries and attributes
  const fallbackScore = computeVisualSummarySimilarity(lostItem, foundItem);
  reasons.push(fallbackScore.reason);

  return {
    score: fallbackScore.score,
    reason: reasons.join(', ')
  };
}

/**
 * Call vision model to compare two images
 */
async function callVisionModelForMatch(
  imageUrl1: string,
  imageUrl2: string,
  summary1: string,
  summary2: string
): Promise<VisionMatchResult | null> {
  const apiKey = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const model = process.env.AI_VISION_MODEL || 'gpt-4-vision-preview';

  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Compare if these two items are the same physical object based on their descriptions.

Image 1: ${imageUrl1}
Summary 1: ${summary1}

Image 2: ${imageUrl2}
Summary 2: ${summary2}

Reply with JSON: {"score": 0.0-1.0, "reason": "explanation"}`
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      const visionResult: VisionMatchResult = {
        score: Math.min(1.0, Math.max(0, parsed.score)),
        reason: parsed.reason || 'AI visual comparison',
        imageScore: parsed.score,
        descriptionScore: 0,
        locationScore: 0,
        totalScore: parsed.score,
        matchReason: parsed.reason
      };
      return visionResult;
    } catch {
      return null;
    }

  } catch (error) {
    console.warn('Vision model call failed:', error);
    return null;
  }
}

/**
 * Fallback image similarity using attributes and summaries
 */
function computeVisualSummarySimilarity(lostItem: Item, foundItem: Item): { score: number; reason: string } {
  const lostAttrs: ExtractedAttributes | null = lostItem.extractedAttributes
    ? JSON.parse(lostItem.extractedAttributes)
    : null;
  const foundAttrs: ExtractedAttributes | null = foundItem.extractedAttributes
    ? JSON.parse(foundItem.extractedAttributes)
    : null;

  let score = 0;
  const reasons: string[] = [];

  // Color match
  if (lostAttrs?.color && foundAttrs?.color) {
    if (lostAttrs.color === foundAttrs.color) {
      score += 0.3;
      reasons.push(`color match (${lostAttrs.color})`);
    }
  }

  // Brand match
  if (lostAttrs?.brand && foundAttrs?.brand) {
    if (lostAttrs.brand === foundAttrs.brand) {
      score += 0.25;
      reasons.push(`brand match (${lostAttrs.brand})`);
    }
  }

  // Category match
  if (lostAttrs?.category && foundAttrs?.category) {
    if (lostAttrs.category === foundAttrs.category) {
      score += 0.2;
      reasons.push(`category match (${lostAttrs.category})`);
    }
  }

  // Unique marks match
  if (lostAttrs?.uniqueMarks && foundAttrs?.uniqueMarks) {
    if (lostAttrs.uniqueMarks === foundAttrs.uniqueMarks) {
      score += 0.25;
      reasons.push('unique marks match');
    }
  }

  // Adjust score based on which items have images
  const hasLostImage = !!(lostItem.imageUrl && lostItem.visualSummary);
  const hasFoundImage = !!(foundItem.imageUrl && foundItem.visualSummary);

  // If one has image and other doesn't, reduce the weight of image score
  const imageWeight = (hasLostImage && hasFoundImage) ? 1.0 : 0.5;

  score = score * imageWeight;

  if (reasons.length === 0) {
    return { score: 0.3, reason: 'limited visual data available' };
  }

  return {
    score: Math.min(1.0, score),
    reason: reasons.join(', ')
  };
}

// ============================================================
// MATCH CALCULATION
// ============================================================

/**
 * Calculate comprehensive match score
 */
export async function calculateMatch(
  lostItem: Item,
  foundItem: Item
): Promise<MatchCalculation> {
  // Compute individual scores
  const locationResult = await computeLocationScore(lostItem, foundItem);
  const descriptionResult = await computeDescriptionScore(lostItem, foundItem);
  const imageResult = await computeImageScore(lostItem, foundItem);

  // Weights for each signal
  const LOCATION_WEIGHT = 0.35;
  const DESCRIPTION_WEIGHT = 0.45;
  const IMAGE_WEIGHT = 0.20;

  // Calculate total score
  const totalScore = (
    locationResult.score * LOCATION_WEIGHT +
    descriptionResult.score * DESCRIPTION_WEIGHT +
    imageResult.score * IMAGE_WEIGHT
  );

  // Generate match reason
  const matchReason = generateMatchReason(
    totalScore,
    imageResult.score,
    descriptionResult.score,
    locationResult.score,
    imageResult.reason,
    descriptionResult.reason,
    locationResult.reason
  );

  return {
    imageScore: Math.round(imageResult.score * 100) / 100,
    descriptionScore: Math.round(descriptionResult.score * 100) / 100,
    locationScore: Math.round(locationResult.score * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    matchReason,
  };
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(
  totalScore: number,
  imageScore: number,
  descriptionScore: number,
  locationScore: number,
  imageReason: string,
  descriptionReason: string,
  locationReason: string
): string {
  const percentage = Math.round(totalScore * 100);

  let reason = `${percentage}% match: `;
  const parts: string[] = [];

  if (descriptionScore > 0.5) {
    parts.push(`similar descriptions (${descriptionReason})`);
  }
  if (locationScore > 0.5) {
    parts.push(`location overlap (${locationReason})`);
  }
  if (imageScore > 0.5) {
    parts.push(`visual ${imageReason}`);
  }

  if (parts.length > 0) {
    reason += parts.join(', ');
  } else {
    reason += 'basic similarities found';
  }

  return reason;
}

// ============================================================
// MATCH PERSISTENCE & NOTIFICATION
// ============================================================

/**
 * Find and save matches for a given item
 */
export async function findAndSaveMatchesForItem(itemId: string): Promise<{
  matchesFound: number;
  newMatches: MatchResult[];
}> {
  if (!itemId) {
    return { matchesFound: 0, newMatches: [] };
  }

  // Get the item
  const item = await prisma.item.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    return { matchesFound: 0, newMatches: [] };
  }

  // Determine opposite type and status
  const oppositeType = item.type === 'LOST' ? 'FOUND' : 'LOST';

  // Find opposite-type OPEN items (excluding same user)
  const candidates = await prisma.item.findMany({
    where: {
      type: oppositeType,
      status: 'OPEN',
      userId: { not: item.userId }, // Exclude self-matches
    },
  });

  const newMatches: MatchResult[] = [];

  for (const candidate of candidates) {
    // Calculate match score
    const matchData = await calculateMatch(
      item.type === 'LOST' ? item : candidate,
      item.type === 'LOST' ? candidate : item
    );

    // Check if meets threshold
    if (matchData.totalScore >= MATCH_THRESHOLD) {
      // Check if match already exists
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { lostItemId: item.id, foundItemId: candidate.id },
            { lostItemId: candidate.id, foundItemId: item.id },
          ],
        },
      });

      if (!existingMatch) {
        // Create new match
        const lostId = item.type === 'LOST' ? item.id : candidate.id;
        const foundId = item.type === 'LOST' ? candidate.id : item.id;

        const newMatch = await prisma.match.create({
          data: {
            lostItemId: lostId,
            foundItemId: foundId,
            imageScore: matchData.imageScore,
            descriptionScore: matchData.descriptionScore,
            locationScore: matchData.locationScore,
            totalScore: matchData.totalScore,
            matchReason: matchData.matchReason,
            status: 'PENDING_REVIEW',
          },
        });

        // Update item status to MATCHED
        await prisma.item.update({
          where: { id: item.id },
          data: { status: 'MATCHED' },
        });

        // Create notifications for item owner
        await prisma.notification.create({
          data: {
            userId: item.userId,
            matchId: newMatch.id,
            title: `Potential ${candidate.type === 'FOUND' ? 'Owner' : 'Finder'} Found`,
            message: `A potential ${candidate.type === 'FOUND' ? 'owner' : 'finder'} match for "${item.title}" was found. Click to review details.`,
            channel: 'IN_APP',
          },
        });

        newMatches.push({
          ...newMatch,
          lostItemId: lostId,
          foundItemId: foundId,
          createdAt: newMatch.createdAt ? new Date(newMatch.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    }
  }

  return {
    matchesFound: candidates.length,
    newMatches,
  };
}

// ============================================================
// BATCH MATCHING
// ============================================================

/**
 * Run matching across all OPEN items
 */
export async function runBatchMatching(): Promise<{
  evaluated: number;
  created: number;
  threshold: number;
}> {
  const openItems = await prisma.item.findMany({
    where: { status: 'OPEN' },
  });

  const evaluated = openItems.length;
  let created = 0;

  for (const item of openItems) {
    const result = await findAndSaveMatchesForItem(item.id);
    created += result.newMatches.length;
  }

  return {
    evaluated,
    created,
    threshold: MATCH_THRESHOLD,
  };
}