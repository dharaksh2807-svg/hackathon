import "./resolve.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
const { endpoint, input, queryInput, bodyInput, pathId } = await import("../../src/server/http.ts");
const { ApiError, databaseError } = await import("../../src/server/errors.ts");
const { EmptyBodySchema, CheckoutRequestSchema, ResolveDisputeRequestSchema, ErrorResponseSchema } = await import("../../src/lib/contracts.ts");
const write = (body: string, extra: Record<string, string> = {}) => new Request("https://fairshift.test/api/disputes", {
  method: "POST", headers: { host: "fairshift.test", origin: "https://fairshift.test", "content-type": "application/json", ...extra }, body,
});

test("strict requests reject unknown fields, bad IDs, repeated query keys and fractional breaks", () => {
  assert.throws(() => input(EmptyBodySchema, { role: "EMPLOYER" }));
  assert.throws(() => input(CheckoutRequestSchema, { unpaidBreakMinutes: 0.1 }));
  assert.throws(() => pathId("someone-elses-shift"));
  assert.throws(() => queryInput(new Request("https://fairshift.test/api/me?orgId=a&orgId=b")));
  assert.throws(() => input(EmptyBodySchema, queryInput(new Request("https://fairshift.test/api/me?unexpected=1"))));
  assert.deepEqual(queryInput(new Request("https://fairshift.test/api/me?reason=hello%20world")), Object.assign(Object.create(null), { reason: "hello world" }));
});

test("JSON writes enforce exact Origin/Host, content type, stream size and valid JSON", async () => {
  assert.deepEqual(await bodyInput(write("{}")), {});
  await assert.rejects(() => bodyInput(write("{}", { origin: "https://evil.test" })));
  await assert.rejects(() => bodyInput(write("{}", { host: "evil.test" })));
  await assert.rejects(() => bodyInput(write("{}", { origin: "null" })));
  await assert.rejects(() => bodyInput(write("{}", { "content-type": "text/plain" })));
  await assert.rejects(() => bodyInput(write("{")));
  await assert.rejects(() => bodyInput(write(JSON.stringify({ reason: "x".repeat(17_000) }))));
});

test("body parsing releases its stream reader after success and validation failures", async t => {
  for (const [name, body, message] of [
    ["valid JSON", "{}", null],
    ["malformed JSON", "{", "Invalid JSON body"],
    ["oversized JSON", JSON.stringify({ reason: "x".repeat(17_000) }), "Request body too large"],
  ] as const) {
    await t.test(name, async () => {
      const request = write(body);
      if (message === null) {
        assert.deepEqual(await bodyInput(request), {});
      } else {
        await assert.rejects(() => bodyInput(request), (error: unknown) =>
          error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400 && error.message === message);
      }
      assert.equal(request.body?.locked, false);
    });
  }
});

test("body parsing releases a failed stream and sanitizes its error", async () => {
  const init: RequestInit & { duplex: "half" } = {
    body: new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error("Internal transport failure")); },
    }),
    duplex: "half",
  };
  const request = new Request(write("{}"), init);
  await assert.rejects(() => bodyInput(request), (error: unknown) =>
    error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.status === 400 && error.message === "Invalid JSON body");
  assert.equal(request.body?.locked, false);
});

test("resolution decisions enforce approved correction and prohibit rejected correction", () => {
  const explanation = "Reviewed synthetic attendance.";
  assert.throws(() => input(ResolveDisputeRequestSchema, { decision: "APPROVED", explanation }));
  assert.throws(() => input(ResolveDisputeRequestSchema, { decision: "REJECTED", explanation, correctedRecordedAmountMinor: 0 }));
  assert.equal(input(ResolveDisputeRequestSchema, { decision: "APPROVED", explanation, correctedRecordedAmountMinor: 0 }).decision, "APPROVED");
});

test("endpoint errors use contract envelopes, no-store and sanitized diagnostics", async () => {
  for (const [code, status] of [["UNAUTHENTICATED", 401], ["FORBIDDEN", 403], ["NOT_FOUND", 404], ["INVALID_STATE", 409]] as const) {
    const response = await endpoint(z.object({ ok: z.boolean() }), async () => { throw new ApiError(code, status, "Safe message"); });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(ErrorResponseSchema.parse(await response.json()).error.code, code);
  }
  const invalid = await endpoint(z.object({ ok: z.boolean() }), async () => ({ ok: "wrong" }));
  assert.equal(invalid.status, 500);
  const internal = await endpoint(z.object({}), async () => { throw new Error("SQL password=SECRET"); });
  assert.equal(internal.status, 500);
  assert.doesNotMatch(await internal.text(), /SECRET|password|SQL/);
  assert.equal(databaseError({ code: "P0001", message: "DUPLICATE_DISPUTE" }).code, "DUPLICATE_DISPUTE");
  assert.equal(databaseError({ code: "40P01", message: "private SQL" }).status, 409);
  assert.equal(databaseError({ code: "XX000", message: "SECRET" }).status, 503);
});

test("unsupported endpoint methods keep the JSON error envelope and Allow header", async () => {
  const { methodNotAllowed } = await import("../../src/server/http.ts");
  const response = methodNotAllowed("GET, HEAD, OPTIONS");
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD, OPTIONS");
  assert.equal(ErrorResponseSchema.parse(await response.json()).error.code, "VALIDATION_ERROR");
});
