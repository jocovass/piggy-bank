import { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "db/index.server";
import { count } from "drizzle-orm";
import { count as countSchema } from "db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

  try {
    // If we can connect to the DB and make a simple query
    // to ourselves, then we are good.
    await Promise.all([
      db.select({ count: count() }).from(countSchema),
      fetch(`${new URL(request.url).protocol}${host}`, {
        method: "HEAD",
        headers: { "X-Healthcheck": "true" },
      }).then((r) => {
        if (!r.ok) return Promise.reject(r);
      }),
    ]);

    return new Response("OK");
  } catch (error) {
    console.log("healthcheck ❌", { error });
    return new Response("ERROR", { status: 500 });
  }
}
