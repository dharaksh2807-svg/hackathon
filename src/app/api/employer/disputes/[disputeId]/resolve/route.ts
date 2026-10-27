import { EmptyBodySchema, ResolveDisputeRequestSchema, ResolveDisputeResponseSchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput, bodyInput, pathId } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ disputeId: string }> }) {
  return endpoint(ResolveDisputeResponseSchema, async () => {
    input(EmptyBodySchema, queryInput(request));
    const body = input(ResolveDisputeRequestSchema, await bodyInput(request));
    const id = pathId((await context.params).disputeId);
    return (await createService()).resolveDispute(id, body);
  });
}

const reject = () => methodNotAllowed("PATCH, OPTIONS");
export { reject as GET, reject as POST, reject as PUT, reject as DELETE };
