import { redirect } from 'next/navigation';

// Organizer profiles now live on the general Admin View Profile page
export default async function AdminOrganizerRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/users/${id}`);
}
