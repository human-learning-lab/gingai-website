import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { resolveRoleId } from '@/data/roles';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress ?? '';

  /* Same resolution the layout uses, fallback included. Refusing here while the
     layout would have admitted the same account is what put people on /pending
     holding a perfectly valid role. */
  const roleId = resolveRoleId(email, user.firstName ?? undefined);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { roleId },
  });

  return NextResponse.json({ roleId });
}
