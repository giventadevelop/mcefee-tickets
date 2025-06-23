import { auth } from "@clerk/nextjs/server";
import { fetchEventDetailsServer } from "@/app/admin/ApiServerActions";
import DiscountCodeListClient from "./DiscountCodeListClient";
import { fetchDiscountCodesForEvent } from "./ApiServerActions";

export default async function DiscountCodeListPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const { userId } = auth();

  if (!userId) {
    return <div>You must be logged in to view this page.</div>;
  }

  const eventDetails = await fetchEventDetailsServer(eventId);
  const discountCodes = await fetchDiscountCodesForEvent(eventId);

  return (
    <DiscountCodeListClient
      eventId={eventId}
      initialDiscountCodes={discountCodes}
      eventDetails={eventDetails}
    />
  );
}