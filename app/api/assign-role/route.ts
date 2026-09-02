import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { resolveRoleId } from '@/data/roles';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress ?? '';

  /* Same resolution the layout uses. Refusing here while the layout admitted
     the same account is what put people on /pending holding a valid role. */
  const roleId = resolveRoleId(email, user.firstName ?? undefined);

  if (!roleId) {
    return NextResponse.json({ error: 'No role found for this email' }, { status: 403 });
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { roleId },
  });

  return NextResponse.json({ roleId });
}
