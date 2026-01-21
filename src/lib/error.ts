// src/lib/error.ts

export type MonoTodoError = {
  code: string;
  message: string;
};

/**
 * Supabaseのエラーオブジェクトをアプリケーション共通のエラー型に変換する
 */
export const parseSupabaseError = (error: any): MonoTodoError => {
  console.error("Supabase Error:", error);

  if (!error) {
    return { code: "UNKNOWN", message: "不明なエラーが発生しました" };
  }

  // Supabase/Postgresのエラーコード抽出ロジック
  const code = error.code || error.hint || "DB_ERROR";
  const message = error.message || "データベース操作に失敗しました";

  return { code, message };
};