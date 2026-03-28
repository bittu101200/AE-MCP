import { z } from "zod";
import { PropertyPathSchema } from "../contracts/property-path.js";
export const PropertyTargetSchema = {
    propertyPath: PropertyPathSchema.optional().describe("Canonical property path object for nested property lookup."),
    propertyPathString: z.string().optional().describe("String shorthand for a property path, e.g. 'Transform.Position'."),
    propertyName: z.string().optional().describe("Legacy direct property name for simple properties."),
};
export const PropertyValueSchema = z.union([
    z.number(),
    z.string(),
    z.boolean(),
    z.null(),
    z.array(z.number()),
    z.array(z.union([z.number(), z.string(), z.boolean(), z.null()])),
    z.record(z.any()),
]);
