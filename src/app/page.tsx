import Experience from "@/components/Experience";
import { listPublic } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const page = await listPublic(null, "C", "latest");
  return <Experience initial={page.items} initialCursor={page.nextCursor} />;
}
