import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProtectedShell from './ProtectedShell';
import { EMAIL_ROLE_MAP, ALLOWED_DOMAINS } from '@/data/roles';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  if (user) {
    const existingRoleId = (user.publicMetadata as { roleId?: string }).roleId;
    if (!existingRoleId) {
      const email = user.emailAddresses
        .find(e => e.id === user.primaryEmailAddressId)
        ?.emailAddress
        ?.toLowerCase();

      if (email) {
        const domain = email.split('@')[1];
        const roleId = EMAIL_ROLE_MAP[email] ?? ALLOWED_DOMAINS[domain];

        if (roleId) {
          const client = await clerkClient();
          await client.users.updateUser(userId, { publicMetadata: { roleId } });
        }
      }
    }
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
