import { requireToken } from "@/lib/auth";
import { documents as docsApi } from "@/lib/api";
import { UploadForm } from "./upload-form";
import { revalidatePath } from "next/cache";

async function deleteDocument(id: string, token: string) {
  "use server";
  await docsApi.delete(token, id);
  revalidatePath("/documents");
}

export default async function DocumentsPage() {
  const token = await requireToken();
  const docs = await docsApi.list(token).catch(() => []);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          Documents
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Upload documents for translation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-1 rounded-lg p-5 h-fit"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>
            Upload Document
          </h2>
          <UploadForm token={token} />
        </div>

        <div className="lg:col-span-2">
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "hsl(var(--muted))" }}>
                  {["Filename", "Status", "Created", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: "hsl(var(--card))" }}>
                {docs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      No documents yet.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <td
                        className="px-4 py-3 max-w-[200px] truncate font-medium"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {doc.filename}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              doc.status === "completed"
                                ? "hsl(142 76% 36% / 0.15)"
                                : "hsl(var(--muted))",
                            color:
                              doc.status === "completed"
                                ? "hsl(142 76% 56%)"
                                : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={async () => {
                            "use server";
                            await deleteDocument(doc.id, token);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs transition-colors hover:text-red-400"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
