import { auth } from '@clerk/nextjs/server';
import { fetchAdminProfileServer } from './ApiServerActions';
import ManageUsageClient from './ManageUsageClient';

export default async function ManageUsagePage() {
  const { userId } = auth();
  const adminProfile = userId ? await fetchAdminProfileServer(userId) : null;
  // Note: We are not fetching all users here anymore to keep it simple.
  // The ManageUsageClient will need to handle fetching users if required.
  return <ManageUsageClient adminProfile={adminProfile} />;
}