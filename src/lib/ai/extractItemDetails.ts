/**
 * AI-powered Item Attribute Extraction Service
 * Supports OpenRouter and NVIDIA NIM compatible APIs
 * Falls back to rule-based extraction when AI is unavailable
 */

// Types
export type ItemType = 'LOST' | 'FOUND';

export interface ExtractedAttributes {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  uniqueMarks?: string;
  keywords: string[];
}

export interface ExtractionResult {
  extractedAttributes: ExtractedAttributes;
  visualSummary: string;
}

// Environment configuration
interface AIConfig {
  apiKey: string | undefined;
  baseUrl: string;
  visionModel: string;
  textModel: string;
}

function getAIConfig(): AIConfig {
  return {
    apiKey: process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    visionModel: process.env.AI_VISION_MODEL || 'gpt-4-vision-preview',
    textModel: process.env.AI_TEXT_MODEL || 'text-embedding-3-small',
  };
}

/**
 * Rule-based fallback extraction when AI is unavailable
 */
function ruleBasedExtraction(title: string, description: string, type: ItemType): ExtractedAttributes {
  const text = `${title} ${description}`.toLowerCase();

  // Common categories and their keywords
  const categoryKeywords: Record<string, string[]> = {
    'Electronics': ['phone', 'laptop', 'tablet', 'computer', 'charger', 'earbuds', 'headphones', 'camera', 'monitor', 'keyboard', 'mouse', 'tablet', 'tv', 'console'],
    'Wallet/Bag': ['wallet', 'bag', 'purse', 'backpack', 'handbag', 'wallet', 'clutch', 'sling', 'duffel', 'tote'],
    'Clothing': ['shirt', 'pants', 'jacket', 'coat', 'dress', 'hat', 'scarf', 'gloves', 'socks', 'shoes', 'sneakers', 'boots', 'jeans', 'jacket'],
    'Keys': ['keys', 'keyring', ' keychain'],
    'Accessories': ['watch', 'jewelry', 'ring', 'necklace', 'bracelet', 'earrings'],
    'Documents': ['license', 'driver', 'id card', 'passport', 'document', 'paper', 'note', 'letter', 'receipt'],
    'Books': ['book', 'novel', 'textbook', 'comic', 'magazine'],
    'Food': ['lunch', 'dinner', 'breakfast', 'snack', 'bottle', 'can', 'package', 'boxed'],
    'Sports': ['ball', 'bat', 'racket', 'glove', 'helmet', 'goggles', 'cleats'],
    'Other': [],
  };

  // Color keywords
  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'brown', 'beige', 'navy', 'olive', 'maroon', 'teal', 'burgundy', 'silver', 'gold'];

  // Brand keywords
  const brands = ['apple', 'samsung', 'google', 'nike', 'adidas', 'puma', 'under armour', 'gucci', 'prada', 'louis vuitton', 'ray ban', 'oakley', 'nike', 'puma', 'herschel', 'peak design', 'amazon', 'microsoft', 'lenovo', 'dell', 'hp', 'bose', 'sony', 'bose'];

  // Extract category
  let category = 'Other';
  let subcategory = '';
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => text.includes(k))) {
      category = cat;
      break;
    }
  }

  if (category === 'Electronics') {
    if (text.includes('phone')) subcategory = 'Phone';
    else if (text.includes('laptop') || text.includes('computer')) subcategory = 'Laptop';
    else if (text.includes('tablet')) subcategory = 'Tablet';
    else if (text.includes('charger') || text.includes('adapter')) subcategory = 'Accessory';
  }

  // Extract color
  const foundColor = colors.find(c => text.includes(c));

  // Extract brand
  const foundBrand = brands.find(b => text.includes(b));

  // Extract unique marks from description
  const uniqueMarks = [];
  if (text.includes('scratch')) uniqueMarks.push('scratch');
  if (text.includes('dent')) uniqueMarks.push('dent');
  if (text.includes('sticker')) uniqueMarks.push('sticker');
  if (text.includes('case')) uniqueMarks.push('case');
  if (text.includes('cracked')) uniqueMarks.push('cracked screen');

  // Extract keywords
  const keywordPatterns = [
    /\b(\d{4}'\s?letter|id|card)\b/i,
    /\b(a\w{3,}|the)\s+(wallet|phone|laptop|bag|keys)\b/i,
    /\b(black|white|blue|red|green|silver|gold)\b/i,
  ];

  const keywords = [];
  for (const pattern of keywordPatterns) {
    const match = text.match(pattern);
    if (match) keywords.push(match[0].toLowerCase());
  }

  // Add type-based keywords
  if (type === 'LOST') keywords.push('lost');
  if (type === 'FOUND') keywords.push('found');

  return {
    category,
    subcategory,
    brand: foundBrand?.charAt(0).toUpperCase() + foundBrand?.slice(1),
    color: foundColor?.charAt(0).toUpperCase() + foundColor?.slice(1),
    uniqueMarks: uniqueMarks.length > 0 ? uniqueMarks.join(', ') : undefined,
    keywords: [...new Set(keywords)],
  };
}

/**
 * Generate visual summary using rule-based approach
 */
function generateVisualSummary(title: string, description: string, type: ItemType): string {
  const text = `${title} ${description}`.toLowerCase();

  // Size indicators
  const sizes = ['small', 'medium', 'large', 'extra large', 'compact', 'mini'];
  const foundSize = sizes.find(s => text.includes(s));

  // Material indicators
  const materials = ['leather', 'fabric', 'plastic', 'metal', 'wood', 'glass', 'paper', 'cardboard'];
  const foundMaterial = materials.find(m => text.includes(m));

  // Build summary
  const parts: string[] = [];

  if (type === 'LOST') {
    parts.push('Lost item reported');
  } else {
    parts.push('Found item reported');
  }

  if (title) parts.push(`Title: "${title}"`);

  const category = ruleBasedExtraction(title, description, type).category;
  if (category && category !== 'Other') parts.push(`Category: ${category}`);

  if (foundMaterial) parts.push(`Material: ${foundMaterial}`);
  if (foundSize) parts.push(`Size: ${foundSize}`);

  const color = ruleBasedExtraction(title, description, type).color;
  if (color) parts.push(`Color: ${color}`);

  const uniqueMarks = ruleBasedExtraction(title, description, type).uniqueMarks;
  if (uniqueMarks) parts.push(`Distinctive features: ${uniqueMarks}`);

  return parts.join('. ') + '.';
}

/**
 * Call external AI API for attribute extraction
 */
async function callAIExtraction(config: AIConfig, title: string, description: string, type: ItemType): Promise<ExtractionResult> {
  if (!config.apiKey) {
    throw new Error('No API key configured');
  }

  const prompt = `You are an AI assistant for a Lost & Found system. Extract structured attributes from the following item report.

Item Type: ${type}
Title: ${title}
Description: ${description}

Return a JSON object with:
- category: One of: Electronics, Wallet/Bag, Clothing, Keys, Accessories, Documents, Books, Food, Sports, Other
- subcategory: Specific type (e.g., "Laptop", "Phone", "Wallet")
- brand: Brand name if mentioned
- color: Primary color if mentioned
- size: Size if mentioned (e.g., "small", "medium", "large")
- uniqueMarks: Any distinctive features, scratches, stickers, etc.
- keywords: Array of 3-5 relevant keywords

Also generate a visual summary describing what the item looks like.`;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.visionModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    return {
      extractedAttributes: {
        category: parsed.category || 'Other',
        subcategory: parsed.subcategory,
        brand: parsed.brand,
        color: parsed.color,
        size: parsed.size,
        uniqueMarks: parsed.uniqueMarks,
        keywords: parsed.keywords || [],
      },
      visualSummary: parsed.visualSummary || generateVisualSummary(title, description, type),
    };
  } catch (error) {
    console.error('AI extraction failed, falling back to rule-based:', error);
    throw error;
  }
}

/**
 * Main extraction function with fallback
 */
export async function extractItemDetails(
  title: string,
  description: string,
  type: ItemType
): Promise<ExtractionResult> {
  const config = getAIConfig();

  // Try AI extraction if API key is configured
  if (config.apiKey) {
    try {
      return await callAIExtraction(config, title, description, type);
    } catch (error) {
      console.warn('AI extraction failed, using fallback:', error);
      // Fall through to rule-based extraction
    }
  }

  // Fallback to rule-based extraction
  return {
    extractedAttributes: ruleBasedExtraction(title, description, type),
    visualSummary: generateVisualSummary(title, description, type),
  };
}

/**
 * Extract attributes from image (placeholder for future implementation)
 */
export async function extractImageDetails(
  imagePath: string,
  mimeType: string
): Promise<{ visualSummary?: string }> {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {};
  }

  // Placeholder for future image analysis
  // Would upload image to AI service and get description
  console.log('Image analysis not implemented yet for:', imagePath);

  return {};
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return !!config.apiKey;
}