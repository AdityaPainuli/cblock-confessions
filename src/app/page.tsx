import { headers } from "next/headers";
import Experience from "@/components/Experience";
import CampusGate from "@/components/CampusGate";
import { checkCampus } from "@/lib/campus";
import { clientIp } from "@/lib/device";
import { listPublic } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Reading the wall is gated too, not just posting to it.
  const ip = clientIp(await headers());
  const campus = checkCampus(ip);
  if (!campus.allowed) return <CampusGate ip={ip} />;

  const page = await listPublic(null, "C", "latest");
  return <Experience initial={page.items} initialCursor={page.nextCursor} />;
}
