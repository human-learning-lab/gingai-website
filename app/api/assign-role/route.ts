import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { EMAIL_ROLE_MAP, ALLOWED_DOMAINS } from '@/data/roles';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress ?? '';

  // Direct email match first, then domain fallback
  const domain = email.split('@')[1] ?? '';
  const roleId = EMAIL_ROLE_MAP[email] ?? ALLOWED_DOMAINS[domain];

  if (!roleId) {
    return NextResponse.json({ error: 'No role found for this email' }, { status: 403 });
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { roleId },
  });

  return NextResponse.json({ roleId });
}
