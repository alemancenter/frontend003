// Admin dashboard API surface, split by domain.
// Re-exported from a single barrel so existing `from "@/lib/api/admin"` imports
// keep working unchanged.
export * from "./roles";
export * from "./users";
export * from "./content";
export * from "./academic";
export * from "./communications";
export * from "./settings";
export * from "./security";
export * from "./contentAudit";
export * from "./analytics";
export * from "./chatbot";
export * from "./ai";
