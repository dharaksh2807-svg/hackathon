import { EmptyBodySchema, MeResponseSchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return endpoint(MeResponseSchema, async () => {
    input(EmptyBodySchema, queryInput(request));
    return (await createService()).me();
  });
}

const reject = () => methodNotAllowed("GET, HEAD, OPTIONS");
export { reject as POST, reject as PUT, reject as PATCH, reject as DELETE };
