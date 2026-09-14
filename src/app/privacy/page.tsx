import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What this site records | C Block Confessions",
  description:
    "What C Block Confessions collects when you post, why, who can see it, and how to get a confession removed.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** Set NEXT_PUBLIC_CONTACT to whatever students should write to. */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT?.trim();

function Contact() {
  if (!CONTACT) return <>whoever runs the site</>;
  if (CONTACT.includes("@") && !CONTACT.includes(" ")) {
    return (
      <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">
        {CONTACT}
      </a>
    );
  }
  return <>{CONTACT}</>;
}

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-10 text-foreground">
      <article className="mx-auto w-full max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.34em] text-muted">
          Galgotias University
        </p>
        <h1 className="mt-3 text-[clamp(1.8rem,7vw,2.5rem)] font-bold leading-tight">
          What this site records
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          Short version: other students can never tell who wrote a confession. The
          person who runs this site can see the device and rough location it was
          sent from. That is there so abuse can be dealt with, and it is worth
          knowing before you post.
        </p>

        <Section title="What other students see">
          <p>
            The text, the tag, the mood, the heart count and how long ago it was
            posted. Nothing else. No name, no account, no block, no course, no
            profile, and nothing that links two confessions to the same person.
          </p>
        </Section>

        <Section title="What the site records with each confession">
          <p>Alongside the text, the following is stored where only the site admin can read it:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your IP address, and the city, region and country it maps to</li>
            <li>Your internet provider</li>
            <li>Your browser, its version and engine</li>
            <li>Your operating system and device model</li>
            <li>Screen size, window size and pixel ratio</li>
            <li>Time zone and language settings</li>
            <li>Processor cores, memory and graphics chip</li>
            <li>A fingerprint derived from the above, which distinguishes one browser from another</li>
            <li>Which block and course you said you were from</li>
            <li>The page you arrived from</li>
          </ul>
          <p>
            This is enough to tell two confessions apart, and in a small group it can
            be enough to work out who wrote one. Post accordingly.
          </p>
        </Section>

        <Section title="Why it is collected">
          <p>
            So that harassment, threats, and posts naming a real person can be traced
            and stopped, and so one person cannot flood the wall. It is not used to
            build profiles of students, and it is not sold or shared with anyone.
          </p>
        </Section>

        <Section title="Who can see it">
          <p>
            Only whoever holds the admin password. It is never shown on the public
            wall and is not reachable with the site&apos;s public key, which cannot read
            that table at all.
          </p>
        </Section>

        <Section title="Hearts and reports">
          <p>
            A heart or a report is recorded against your browser fingerprint so each
            device counts once. Your browser also remembers what you hearted, which
            stays on your device.
          </p>
        </Section>

        <Section title="Campus network">
          <p>
            The wall is reachable only from the university network, so the site also
            sees the address you connect from. That is what decides whether you get
            in.
          </p>
        </Section>

        <Section title="Getting something taken down">
          <p>
            Anything on the wall can be reported with the flag under a confession.
            Enough reports and it comes down on its own pending review. If a
            confession is about you, or you want your own removed, contact{" "}
            <Contact /> and quote the first few words of it.
          </p>
        </Section>

        <Section title="How long it is kept">
          <p>
            Confessions stay up until they are removed. The submission records are
            kept for as long as the wall runs, and go when the site does.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under India&apos;s Digital Personal Data Protection Act 2023 you can ask
            what is held about you, ask for it to be corrected, and ask for it to be
            erased. Send that request to <Contact />.
          </p>
        </Section>

        <p className="mt-10 text-sm">
          <Link href="/" className="text-maroon underline underline-offset-2">
            Back to the wall
          </Link>
        </p>
      </article>
    </main>
  );
}
