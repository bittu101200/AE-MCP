export function createBridgeHealthResponse(details) {
    return {
        status: "success",
        command: "bridge-health",
        timestamp: new Date().toISOString(),
        data: details,
    };
}
