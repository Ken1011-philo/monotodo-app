import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

// --- FocusPage: 単一ファイルで完結する実装 ---
// - タイマー（25:00）
// - 円形プログレス（react-circular-progressbar）
// - 一時停止/再開（トグル）
// - 中断（確認ダイアログ）
// - 終了（確認ダイアログ -> 完了処理のプレースホルダ）
// - Focus 中はナビ非表示（body にクラス追加）
// - Back 操作やブラウザ離脱を抑制
// - Do へ戻るは '/do' へ遷移（必要に応じて変更）

export default function FocusPage() {
  const navigate = useNavigate();

  const INITIAL_TIME = 25 * 60; // 秒
  const [time, setTime] = useState<number>(INITIAL_TIME);
  const [isRunning, setIsRunning] = useState<boolean>(true); // ページ入ったら自動で開始したい場合 true

  // モーダル管理
  const [showInterruptDialog, setShowInterruptDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // interval ref (ブラウザの setInterval は number を返す)
  const intervalRef = useRef<number | null>(null);

  // ------------------ タイマー制御 ------------------
  useEffect(() => {
    if (isRunning) {
      // setInterval は window の型を使う
      intervalRef.current = window.setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            // 終了時の挙動: 自動停止して 0 に
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    // ページアンマウント時にクラス除去
    return () => {
      document.body.classList.remove("focus-mode");
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // ------------------ ナビ抑制 & ナビバー非表示 ------------------
  useEffect(() => {
    // body にクラスをつけてアプリ側のナビを非表示にする
    document.body.classList.add("focus-mode");

    // ブラウザ離脱警告
    window.addEventListener("beforeunload", beforeUnload);

    // Back キー（履歴操作）を押されたときに履歴を押し戻す
    // 効き目: 一般的な Back 操作を抑止できる簡易実装
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);

    // タスク切り替え (アプリ内) を完全に阻止するには router の blocker が望ましいが
    // ここではブラウザレベルの防御をおこなう

    return () => {
      document.body.classList.remove("focus-mode");
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beforeUnload(e: BeforeUnloadEvent) {
    // カスタムメッセージは多くのブラウザで無視されるが、警告は表示される
    e.preventDefault();
    e.returnValue = "フォーカス中はページ移動できません。中断または完了してから移動してください。";
    return e.returnValue;
  }

  function onPopState() {
    // popstate（Back）が発生したら履歴を押し戻す
    window.history.pushState(null, "", window.location.href);
  }

  // ------------------ 表示系ユーティリティ ------------------
  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const percent = Math.round(((INITIAL_TIME - time) / INITIAL_TIME) * 100);

  // ------------------ ボタン挙動 ------------------
  const toggleRunning = () => {
    // pause/resume はメトリクスに影響しない
    setIsRunning((p) => !p);
  };

  const onClickInterrupt = () => {
    // 中断ボタンは確認ダイアログを出す
    setIsRunning(false);
    setShowInterruptDialog(true);
  };

  const onConfirmInterruptReturn = () => {
    // 中断確定: タスク/ログ/メトリクスは更新せず、Do に戻る
    resetTimer();
    // TODO: metrics/log 更新しない
    navigateToDo();
  };

  const onClickComplete = () => {
    setIsRunning(false);
    setShowCompleteDialog(true);
  };

  const onConfirmComplete = async () => {
    // 完了確定: completed=true、logs/metrics 更新、Do へ戻る
    // --- プレースホルダ: 実際は API を呼ぶ ---
    await fakeUpdateTaskCompleted();
    await fakeUpdateLogsAndMetrics();

    resetTimer();
    navigateToDo();
  };

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setTime(INITIAL_TIME);
  };

  const navigateToDo = () => {
    // Do へ戻る。アプリに合わせてパスを変更してください。
    navigate("/do");
  };

  // ------------------ プレースホルダ: タスク/ログ更新 ------------------
  async function fakeUpdateTaskCompleted() {
    // ここに API 呼び出しを入れる (例: supabase.rpc / fetch)
    // await api.patch(`/tasks/${taskId}`, { completed: true });
    return new Promise((r) => setTimeout(r, 300));
  }

  async function fakeUpdateLogsAndMetrics() {
    // logs と metrics を更新するプレースホルダ
    return new Promise((r) => setTimeout(r, 300));
  }

  // ------------------ JSX ------------------
  return (
    <section className="space-y-8 rounded-3xl bg-background/10 p-10 text-background shadow-xl shadow-black/20 max-w-3xl mx-auto">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-background/60">Focus</p>
        <h1 className="text-4xl font-semibold">ポモドーロタイマー</h1>
        <p className="text-sm text-background/70">
          ナビゲーションを排除し、一つのタスクに集中します。
        </p>
      </header>

      {/* タイマー + プログレス */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-56 h-56">
          <CircularProgressbar
            value={percent}
            text={formatTime(time)}
            strokeWidth={6}
            styles={buildStyles({
              textColor: "var(--foreground, #fff)",
              pathColor: "var(--background, #fff)",
              trailColor: "rgba(255,255,255,0.12)",
              textSize: "28px",
            })}
          />
        </div>
        <p className="text-sm text-background/70">{isRunning ? "カウント中…" : "一時停止中"}</p>
      </div>

      {/* ボタン群 */}
      <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold">
        <button
          onClick={toggleRunning}
          className="rounded-full bg-background px-6 py-2 text-foreground transition hover:bg-background/80"
        >
          {isRunning ? "一時停止" : "再開"}
        </button>

        <button
          onClick={onClickInterrupt}
          className="rounded-full border border-background/60 px-6 py-2 text-background hover:bg-background/10"
        >
          中断
        </button>

        <button
          onClick={onClickComplete}
          className="rounded-full border border-background/60 px-6 py-2 text-background hover:bg-background/10"
        >
          終了（完了）
        </button>
      </div>

      {/* 中断ダイアログ */}
      {showInterruptDialog && (
        <Modal onClose={() => setShowInterruptDialog(false)}>
          <h3 className="text-lg font-semibold">セッションを中断しますか？</h3>
          <p className="mt-2">タスクは完了になりません。セッションを中断しますか？</p>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => {
                // 続ける: ダイアログ閉じて再開
                setShowInterruptDialog(false);
                setIsRunning(true);
              }}
              className="rounded px-3 py-1 border"
            >
              続ける
            </button>

            <button
              onClick={() => {
                setShowInterruptDialog(false);
                onConfirmInterruptReturn();
              }}
              className="rounded px-3 py-1 bg-red-600 text-white"
            >
              中断して戻る
            </button>

            <button
              onClick={() => {
                setShowInterruptDialog(false);
                // キャンセルは何もしない（そのまま停止状態）
              }}
              className="rounded px-3 py-1 border"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {/* 完了ダイアログ */}
      {showCompleteDialog && (
        <Modal onClose={() => setShowCompleteDialog(false)}>
          <h3 className="text-lg font-semibold">タスクを完了しますか？</h3>
          <p className="mt-2">タスクが完了になります。セッションを終了しますか？</p>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => {
                // 完了して戻る
                onConfirmComplete();
              }}
              className="rounded px-3 py-1 bg-green-600 text-white"
            >
              完了して戻る
            </button>

            <button
              onClick={() => {
                // 続ける: ダイアログ閉じて再開
                setShowCompleteDialog(false);
                setIsRunning(true);
              }}
              className="rounded px-3 py-1 border"
            >
              続ける
            </button>

            <button
              onClick={() => {
                setShowCompleteDialog(false);
              }}
              className="rounded px-3 py-1 border"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ------------------ シンプルなモーダル実装 ------------------
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 text-black">
        {children}
      </div>
    </div>
  );
}
