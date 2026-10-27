import { EmptyBodySchema, ShiftResponseSchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput, bodyInput, pathId } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ shiftId: string }> }) {
  return endpoint(ShiftResponseSchema, async () => {
    input(EmptyBodySchema, queryInput(request));
    input(EmptyBodySchema, await bodyInput(request));
    const id = pathId((await context.params).shiftId);
    return (await createService()).attendance(id);
  });
}

const reject = () => methodNotAllowed("POST, OPTIONS");
export { reject as GET, reject as PUT, reject as PATCH, reject as DELETE };
