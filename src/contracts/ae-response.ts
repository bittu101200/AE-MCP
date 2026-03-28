export type AEStatus = "success" | "error";

export interface AEWarning {
  code?: string;
  message: string;
  details?: unknown;
}

export interface AEErrorDetails {
  code: string;
  message: string;
  rawMessage?: string;
  retryable?: boolean;
  userActionable?: boolean;
  details?: unknown;
}

export interface AEResponseMeta {
  versionDependent?: boolean;
  hostVersion?: string;
  truncated?: boolean;
  nextHandles?: unknown;
  legacyPayload?: boolean;
}

export interface AEResponse<T = unknown> {
  status: AEStatus;
  command: string;
  commandId?: string;
  timestamp: string;
  data?: T;
  error?: AEErrorDetails;
  warnings?: AEWarning[];
  meta?: AEResponseMeta;
  raw?: unknown;
}

export const AE_ERROR_CODES = {
  APP_NOT_AVAILABLE: "APP_NOT_AVAILABLE",
  PROJECT_NOT_OPEN: "PROJECT_NOT_OPEN",
  COMP_NOT_FOUND: "COMP_NOT_FOUND",
  LAYER_NOT_FOUND: "LAYER_NOT_FOUND",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  PROP_NOT_FOUND: "PROP_NOT_FOUND",
  EFFECT_NOT_FOUND: "EFFECT_NOT_FOUND",
  INVALID_IDENTIFIER: "INVALID_IDENTIFIER",
  INVALID_VALUE: "INVALID_VALUE",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
  VERSION_UNSUPPORTED: "VERSION_UNSUPPORTED",
  TIMEOUT: "TIMEOUT",
  BRIDGE_STALE_RESULT: "BRIDGE_STALE_RESULT",
  BRIDGE_MALFORMED_RESULT: "BRIDGE_MALFORMED_RESULT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AEErrorCode = typeof AE_ERROR_CODES[keyof typeof AE_ERROR_CODES];
