import Experience from "@/components/Experience";
import { listPublic } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await listPublic(null);
  return <Experience initial={initial} />;
}
