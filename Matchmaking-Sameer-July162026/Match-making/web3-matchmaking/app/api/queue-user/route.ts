import { NextResponse } from 'next/server';

// This is a secure, server-side-only endpoint.
// The client will call this to securely add a user to the RabbitMQ processing queue.

export async function POST(request: Request) {
  try {
    const userData = await request.json();

    const rabbitMqApiKey = process.env.RABBITMQ_API_KEY;
    const rabbitMqUrl = process.env.RABBITMQ_API_URL; 

    if (!rabbitMqApiKey || !rabbitMqUrl) {
      console.error("RabbitMQ API key or URL is not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch(`${rabbitMqUrl}/api/queue/add-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': rabbitMqApiKey, // Add the secret API key here
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RabbitMQ API error:", errorText);
      return NextResponse.json({ error: `RabbitMQ API error: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in queue-user endpoint:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}