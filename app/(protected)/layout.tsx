import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProtectedShell from './ProtectedShell';
import { EMAIL_ROLE_MAP, resolveRoleId } from '@/data/roles';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  if (user) {
    const existingRoleId = (user.publicMetadata as { roleId?: string }).roleId;

    const email = user.emailAddresses
      .find(e => e.id === user.primaryEmailAddressId)
      ?.emailAddress
      ?.toLowerCase();

    const roleByEmail = email ? EMAIL_ROLE_MAP[email] : undefined;
    const roleId = resolveRoleId(email, user.firstName ?? undefined);

    // Always update if we have an email match (fixes wrong assignments).
    // For domain/name fallbacks, only set when missing. An account that
    // resolves to nothing is left alone and lands on /pending.
    if (roleId && (!existingRoleId || roleByEmail)) {
      const client = await clerkClient();
      await client.users.updateUser(userId, { publicMetadata: { roleId } });
    }
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
