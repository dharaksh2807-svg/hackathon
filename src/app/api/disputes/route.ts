import { CreateDisputeRequestSchema, DisputeResponseSchema, DisputesQuerySchema, DisputesResponseSchema, EmptyBodySchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput, bodyInput } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return endpoint(DisputesResponseSchema, async () => {
    const query = input(DisputesQuerySchema, queryInput(request));
    return (await createService()).disputes(query);
  });
}

export async function POST(request: Request) {
  return endpoint(DisputeResponseSchema, async () => {
    input(EmptyBodySchema, queryInput(request));
    const body = input(CreateDisputeRequestSchema, await bodyInput(request));
    return (await createService()).createDispute(body.shiftId, body.reason);
  }, 201);
}

const reject = () => methodNotAllowed("GET, POST, HEAD, OPTIONS");
export { reject as PUT, reject as PATCH, reject as DELETE };
