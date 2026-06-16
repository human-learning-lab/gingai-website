import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProtectedShell from './ProtectedShell';
import { EMAIL_ROLE_MAP, ALLOWED_DOMAINS, ROLES } from '@/data/roles';

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

    const domain = email?.split('@')[1];
    const firstName = user.firstName?.toLowerCase().trim();

    const roleByEmail  = email ? EMAIL_ROLE_MAP[email] : undefined;
    const roleByDomain = domain ? ALLOWED_DOMAINS[domain] : undefined;
    const roleByName   = firstName
      ? ROLES.find(r => r.name.toLowerCase().split(' ')[0] === firstName)?.id
      : undefined;

    const roleId = roleByEmail ?? roleByDomain ?? roleByName ?? 'christian';

    // Always update if we have an email match (fixes wrong assignments).
    // For domain/name fallbacks, only set when missing.
    if (!existingRoleId || roleByEmail) {
      const client = await clerkClient();
      await client.users.updateUser(userId, { publicMetadata: { roleId } });
    }
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
