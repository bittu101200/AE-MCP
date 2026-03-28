import type { AEResponse } from "../contracts/ae-response.js";

export function createBridgeHealthResponse(details: {
  bridgeDir: string;
  commandFileExists: boolean;
  resultFileExists: boolean;
  resultFileMtime?: string;
  resultPreview?: unknown;
}): AEResponse<typeof details> {
  return {
    status: "success",
    command: "bridge-health",
    timestamp: new Date().toISOString(),
    data: details,
  };
}
