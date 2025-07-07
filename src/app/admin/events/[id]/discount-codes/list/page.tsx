import { auth } from "@clerk/nextjs/server";
import { fetchEventDetailsServer } from "@/app/admin/ApiServerActions";
import DiscountCodeListClient from "./DiscountCodeListClient";
import { fetchDiscountCodesForEvent } from "./ApiServerActions";

export default async function DiscountCodeListPage(props: { params: { id: string } }) {
  const { params } = props;
  const eventId = params.id;
  const { userId } = auth();

  if (!userId) {
    return <div>You must be logged in to view this page.</div>;
  }

  // fetchEventDetailsServer expects a number, fetchDiscountCodesForEvent expects a string
  const eventDetails = await fetchEventDetailsServer(Number(eventId));
  const discountCodes = await fetchDiscountCodesForEvent(eventId);

  return (
    <DiscountCodeListClient
      eventId={eventId}
      initialDiscountCodes={discountCodes}
      eventDetails={eventDetails}
    />
  );
}