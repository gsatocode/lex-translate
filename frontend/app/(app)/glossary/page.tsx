import { requireToken } from "@/lib/auth";
import { glossary as glossaryApi } from "@/lib/api";
import { GlossaryClient } from "./glossary-client";

export default async function GlossaryPage() {
  const token = await requireToken();
  const terms = await glossaryApi.list(token).catch(() => []);
  return <GlossaryClient token={token} initialTerms={terms} />;
}
