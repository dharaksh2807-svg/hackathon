import type { ErrorCode } from "../lib/contracts";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const known = {
  NOT_FOUND: [404, "Record not found"],
  FORBIDDEN: [403, "Organization access denied"],
  INVALID_STATE: [409, "Action is not valid in the current state; resolution requires recorded pay"],
  DUPLICATE_DISPUTE: [409, "An open dispute already exists for this shift"],
  VALIDATION_ERROR: [400, "Invalid input or paid attendance duration"],
} as const;

/** Only translate our own symbolic DB errors. Never send SQL diagnostics to clients. */
export function databaseError(error: { code?: string; message?: string }): ApiError {
  const symbol = error.message ?? "";
  if (error.code === "P0001" && Object.hasOwn(known, symbol)) {
    const [status, message] = known[symbol as keyof typeof known];
    return new ApiError(symbol as ErrorCode, status, message);
  }
  if (["40001", "40P01", "23505"].includes(error.code ?? "")) {
    return new ApiError("CONFLICT", 409, "Concurrent change; refresh and retry");
  }
  return new ApiError("SERVER_ERROR", 503, "Database is unavailable");
}
