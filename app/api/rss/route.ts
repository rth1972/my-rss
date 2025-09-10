import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const feedUrl = searchParams.get('url');

  if (!feedUrl) {
    return NextResponse.json({ error: 'Missing feed URL parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(feedUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch RSS feed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the RSS feed.' },
      { status: 500 }
    );
  }
}