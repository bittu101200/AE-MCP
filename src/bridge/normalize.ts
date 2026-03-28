import { AEResponse, AE_ERROR_CODES, type AEErrorCode } from "../contracts/ae-response.js";

function inferErrorCode(message: string): AEErrorCode {
  if (/composition not found|comp not found/i.test(message)) return AE_ERROR_CODES.COMP_NOT_FOUND;
  if (/layer not found/i.test(message)) return AE_ERROR_CODES.LAYER_NOT_FOUND;
  if (/property .*not found|prop not found/i.test(message)) return AE_ERROR_CODES.PROP_NOT_FOUND;
  if (/item not found/i.test(message)) return AE_ERROR_CODES.ITEM_NOT_FOUND;
  if (/timed out/i.test(message)) return AE_ERROR_CODES.TIMEOUT;
  if (/unsupported/i.test(message)) return AE_ERROR_CODES.UNSUPPORTED_OPERATION;
  if (/invalid|out of range|no active comp|no project/i.test(message)) return AE_ERROR_CODES.INVALID_VALUE;
  return AE_ERROR_CODES.INTERNAL_ERROR;
}

function isNormalizedEnvelope(parsed: unknown): parsed is AEResponse {
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  return (obj.status === "success" || obj.status === "error") && typeof obj.command === "string" && typeof obj.timestamp === "string";
}

function stripDoubleWrapping(parsed: Record<string, unknown>): unknown {
  if (parsed.data && typeof parsed.data === "object") {
    const inner = parsed.data;
    if (isNormalizedEnvelope(inner as Record<string, unknown>)) {
      return inner;
    }
  }
  return parsed;
}

export function createBridgeTimeoutResponse(command: string, commandId?: string): AEResponse {
  return {
    status: "error",
    command,
    commandId,
    timestamp: new Date().toISOString(),
    error: {
      code: AE_ERROR_CODES.TIMEOUT,
      message: `Timed out waiting for bridge result for '${command}'.`,
      retryable: true,
      userActionable: true,
    },
  };
}

export function normalizeBridgePayload(text: string, command: string, commandId?: string): AEResponse {
  try {
    const parsed = JSON.parse(text);
    
    if (isNormalizedEnvelope(parsed)) {
      const stripped = stripDoubleWrapping(parsed as unknown as Record<string, unknown>);
      if (stripped !== parsed) {
        return stripped as AEResponse;
      }
      return parsed as AEResponse;
    }

    const timestamp = parsed?._responseTimestamp || new Date().toISOString();
    const effectiveCommandId = commandId || parsed?._commandId;
    
    if (parsed?.status === "error" || parsed?.error) {
      const message = String(parsed?.message || parsed?.error || "Unknown bridge error");
      const code = parsed?.code || parsed?.error?.code || inferErrorCode(message);
      return {
        status: "error",
        command,
        commandId: effectiveCommandId,
        timestamp,
        error: {
          code,
          message,
          rawMessage: message,
          retryable: /timed out|stale/i.test(message),
          userActionable: true,
        },
        raw: parsed,
        meta: { legacyPayload: true },
      };
    }

    const data = parsed?.data !== undefined ? parsed.data : parsed;
    return {
      status: "success",
      command,
      commandId: effectiveCommandId,
      timestamp,
      data,
      raw: parsed,
      meta: { legacyPayload: Boolean(parsed?._responseTimestamp) },
    };
  } catch {
    return {
      status: "error",
      command,
      commandId,
      timestamp: new Date().toISOString(),
      error: {
        code: AE_ERROR_CODES.BRIDGE_MALFORMED_RESULT,
        message: "Bridge returned a non-JSON payload.",
        rawMessage: text,
      },
      raw: text,
    };
  }
}
