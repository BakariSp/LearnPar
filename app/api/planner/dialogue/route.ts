import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Next.js API Route] Dialogue request received');
    
    // Get the request body
    const body = await request.json();
    console.log('[Next.js API Route] Request body:', JSON.stringify(body));
    
    // Get auth headers from the incoming request
    const authHeaders: Record<string, string> = {};
    const authorization = request.headers.get('authorization');
    if (authorization) {
      authHeaders['Authorization'] = authorization;
    }
    
    console.log('[Next.js API Route] Auth headers present:', !!authorization);
    
    // Get the backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const targetUrl = `${backendUrl}/api/planner/dialogue`;
    
    console.log('[Next.js API Route] Forwarding to:', targetUrl);
    console.log('[Next.js API Route] Request timestamp:', new Date().toISOString());
    
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[Next.js API Route] Request timed out after 4 minutes');
      controller.abort();
    }, 240000); // 4 minutes timeout (longer than backend timeout)
    
    // Forward the request to the backend with extended timeout
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    // Clear the timeout if request completes
    clearTimeout(timeoutId);
    
    console.log('[Next.js API Route] Backend response status:', response.status);
    console.log('[Next.js API Route] Response timestamp:', new Date().toISOString());
    
    if (!response.ok) {
      console.error('[Next.js API Route] Backend error:', response.status, response.statusText);
      
      let errorMessage = `Backend Error: ${response.status}`;
      try {
        const errorData = await response.text();
        console.error('[Next.js API Route] Backend error details:', errorData);
        errorMessage = errorData || errorMessage;
      } catch (e) {
        console.error('[Next.js API Route] Could not read error response:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    console.log('[Next.js API Route] Successfully forwarded response');
    
    // Return the response with proper headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error: any) {
    console.error('[Next.js API Route] Error:', error);
    
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - AI processing took longer than expected';
      statusCode = 504;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 