import { z } from "zod";
export const PropertyPathSegmentSchema = z.object({
    name: z.string().min(1).optional(),
    matchName: z.string().min(1).optional(),
    index: z.number().int().positive().optional(),
}).refine((segment) => Boolean(segment.name || segment.matchName || segment.index), { message: "Property path segment requires name, matchName, or index." });
export const PropertyPathSchema = z.object({
    segments: z.array(PropertyPathSegmentSchema).min(1),
});
export function stringifyPropertyPath(path) {
    return path.segments
        .map((segment) => {
        if (segment.matchName)
            return `matchName:${segment.matchName}`;
        if (segment.name)
            return `name:${segment.name}`;
        return `index:${segment.index}`;
    })
        .join(" > ");
}
export function parsePropertyPath(input) {
    if (typeof input !== "string") {
        return PropertyPathSchema.parse(input);
    }
    const trimmed = input.trim();
    if (!trimmed) {
        throw new Error("Property path string cannot be empty.");
    }
    const tokens = trimmed.split(/\s*(?:>|\.)\s*/).filter(Boolean);
    const segments = tokens.map((token) => {
        if (/^matchName:/i.test(token)) {
            return { matchName: token.replace(/^matchName:/i, "") };
        }
        if (/^name:/i.test(token)) {
            return { name: token.replace(/^name:/i, "") };
        }
        if (/^index:/i.test(token)) {
            return { index: Number(token.replace(/^index:/i, "")) };
        }
        if (/^\d+$/.test(token)) {
            return { index: Number(token) };
        }
        return { name: token };
    });
    return PropertyPathSchema.parse({ segments });
}
export function toBridgePropertyPath(input) {
    return parsePropertyPath(input);
}
