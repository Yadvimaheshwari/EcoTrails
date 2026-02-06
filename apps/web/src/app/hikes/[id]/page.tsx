import { redirect } from 'next/navigation';

export default function HikePage({ params }: { params: { id: string } }) {
  // Redirect to the new live hike page
  redirect(`/hikes/${params.id}/live`);
}
