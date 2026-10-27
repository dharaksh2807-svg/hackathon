import { ShiftsQuerySchema, ShiftsResponseSchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return endpoint(ShiftsResponseSchema, async () => {
    const query = input(ShiftsQuerySchema, queryInput(request));
    return (await createService()).shifts(query);
  });
}

const reject = () => methodNotAllowed("GET, HEAD, OPTIONS");
export { reject as POST, reject as PUT, reject as PATCH, reject as DELETE };
