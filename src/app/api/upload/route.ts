import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile, validateFile, validateFileSize } from '@/lib/upload/imageUpload';

// POST /api/upload - Handle image upload
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid multipart form data: no boundary' },
        { status: 400 }
      );
    }

    const boundary = boundaryMatch[1];
    const buffer = Buffer.from(await request.arrayBuffer());

    // Parse multipart form data
    const { fields, files } = await parseMultipartForm(buffer, boundary);

    // Check for file
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const file = files[fileKeys[0]];

    // Validate file type
    const typeValidation = validateFile(file.mimeType);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { success: false, error: typeValidation.error },
        { status: 400 }
      );
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.buffer.length);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { success: false, error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Save file
    const result = await saveUploadedFile(file.buffer, file.mimeType, file.name);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      filePath: result.filePath,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Simple multipart form parser
 */
async function parseMultipartForm(
  body: Buffer,
  boundary: string
): Promise<{ fields: Record<string, string>; files: Record<string, { buffer: Buffer; mimeType: string; name: string }> }> {
  const fields: Record<string, string> = {};
  const files: Record<string, { buffer: Buffer; mimeType: string; name: string }> = {};

  const parts = body.toString('utf-8').split(`--${boundary}`);
  const boundaryMarker = `\r\n--${boundary}`;

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;

    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headers = part.substring(0, headerEndIndex);
    let content = part.substring(headerEndIndex + 4);

    // Remove trailing boundary markers
    content = content.replace(/-\r\n$/, '');

    // Parse content-disposition
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const typeMatch = headers.match(/Content-Type:\s*([^\s\r\n]+)/i);

    if (!nameMatch) continue;

    const fieldName = nameMatch[1];

    if (filenameMatch && typeMatch) {
      // This is a file
      files[fieldName] = {
        buffer: Buffer.from(content, 'binary'),
        mimeType: typeMatch[1],
        name: filenameMatch[1],
      };
    } else {
      // This is a field
      fields[fieldName] = content;
    }
  }

  return { fields, files };
}