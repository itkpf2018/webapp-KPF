import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/changelog
 * Returns the current version info and release notes
 */
export async function GET(request: NextRequest) {
  try {
    // Read version.json from public directory
    const versionPath = join(process.cwd(), 'public', 'version.json');
    const versionData = await readFile(versionPath, 'utf-8');
    const versionInfo = JSON.parse(versionData);

    // Add cache control headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return NextResponse.json(
      {
        success: true,
        data: versionInfo,
      },
      { headers }
    );
  } catch (error) {
    console.error('[Changelog API] Error reading version file:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read version information',
      },
      { status: 500 }
    );
  }
}
