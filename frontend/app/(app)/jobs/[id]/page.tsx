import { requireToken } from "@/lib/auth";
import { jobs as jobsApi } from "@/lib/api";
import { JobPoller } from "./job-poller";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const token = await requireToken();

  let job;
  try {
    job = await jobsApi.get(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <JobPoller jobId={id} token={token} initialJob={job} />;
}
