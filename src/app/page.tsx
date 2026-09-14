import { headers } from "next/headers";
import Experience from "@/components/Experience";
import DemoModeNotice from "@/components/DemoModeNotice";
import { canComment, commentGateEnabled } from "@/lib/network";
import { clientIp } from "@/lib/device";
import { hasSupabase, listPublic } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  // The wall is open to everyone. Only replying is limited to the block
  // network, and the UI needs to know which side of that line the reader is on.
  const ip = clientIp(await headers());
  const mayComment = canComment(ip);
  const gated = commentGateEnabled();

  const page = await listPublic(null, "C", "latest");

  // A deployed site with no database loses posts at random, so say so.
  const unconfigured = process.env.NODE_ENV === "production" && !hasSupabase();

  return (
    <>
      <Experience
        initial={page.items}
        initialCursor={page.nextCursor}
        mayComment={mayComment}
        commentGate={gated}
      />
      {unconfigured && <DemoModeNotice />}
    </>
  );
}
