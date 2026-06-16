import { NextResponse } from 'next/server';

// Viktor: replace this URL with your alarm server endpoint when deployed
const ALARM_URL = 'https://alarm-service-742926686826.europe-north1.run.app/';

// Expected alarm shape from Viktor's server:
// [{ "id": "string", "type": "positive"|"negative"|"neutral", "message": "string" }]

export async function GET() {
  try {
    const res = await fetch(ALARM_URL + "check_alarm");
    if (!res.ok) {
      // Server not ready yet — return empty list silently
      return NextResponse.json([]);
    }
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    // Alarm server not yet deployed — return empty list
    return NextResponse.json([]);
  }
}

export async function POST(){
  try {
	const res = await fetch(ALARM_URL);
  } catch {
	return NextResponse.json([]);
  }
}
