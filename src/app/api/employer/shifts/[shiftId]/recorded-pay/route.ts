import { EmptyBodySchema, RecordedPayResponseSchema, SetRecordedPayRequestSchema } from "@/lib/contracts";
import { createService } from "@/server/auth";
import { methodNotAllowed, endpoint, input, queryInput, bodyInput, pathId } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ shiftId: string }> }) {
  return endpoint(RecordedPayResponseSchema, async () => {
    input(EmptyBodySchema, queryInput(request));
    const body = input(SetRecordedPayRequestSchema, await bodyInput(request));
    const id = pathId((await context.params).shiftId);
    return (await createService()).recordPay(id, body.amountMinor);
  });
}

const reject = () => methodNotAllowed("PUT, OPTIONS");
export { reject as GET, reject as POST, reject as PATCH, reject as DELETE };
