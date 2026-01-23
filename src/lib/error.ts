// src/lib/error.ts
// Supabase error handling utilities.

export type MonoTodoError = {
  code: string;
  message: string;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  hint?: string | null;
};

const isSupabaseErrorLike = (value: unknown): value is SupabaseErrorLike =>
  typeof value === "object" && value !== null
    ? "code" in value || "message" in value || "hint" in value
    : false;

const FALLBACK_MESSAGE = "Unexpected error occurred.";
const DB_FALLBACK_MESSAGE = "A database error occurred.";

/**
 * Normalize Supabase errors into a MonoTodoError shape.
 */
export const parseSupabaseError = (error: unknown): MonoTodoError => {
  console.error("Supabase Error:", error);

  if (!isSupabaseErrorLike(error)) {
    return { code: "UNKNOWN", message: FALLBACK_MESSAGE };
  }

  const code = error.code ?? error.hint ?? "DB_ERROR";
  const message = error.message ?? DB_FALLBACK_MESSAGE;

  return { code, message };
};
