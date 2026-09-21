import { redirect } from "next/navigation";

/** Group rooms are disabled — keep route for old links. */
export default function NewGroupRoomPage() {
  redirect("/messages");
}
