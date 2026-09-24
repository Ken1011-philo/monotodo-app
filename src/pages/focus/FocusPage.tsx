import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { CheckCircle2, Pause, Play, Square } from "lucide-react";

import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- FocusPage: 単一ファイルで完結する実装 ---
// - タイマー（25:00）
// - 円形プログレス（react-circular-progressbar）
// - 一時停止/再開（トグル）
// - 中断（確認ダイアログ）
// - 終了（確認ダイアログ -> 完了処理のプレースホルダ）
// - Focus 中はナビ非表示（body にクラス追加）
// - Back 操作やブラウザ離脱を抑制
// - Do へ戻るは '/do' へ遷移（必要に応じて変更）

function beforeUnload(e: BeforeUnloadEvent) {
  // カスタムメッセージは多くのブラウザで無視されるが、警告は表示される
  e.preventDefault();
  e.returnValue =
    "フォーカス中はページ移動できません。中断または完了してから移動してください。";
  return e.returnValue;
}

function onPopState() {
  // popstate（Back）が発生したら履歴を押し戻す
  window.history.pushState(null, "", window.location.href);
}

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
  }, []);

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
    navigate("/");
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
    <Card className="shadow-xl shadow-black/20">
      <CardHeader>
        <SectionHeader
          as="h1"
          align="center"
          eyebrow="Focus"
          title="ポモドーロタイマー"
          description="ナビゲーションを排除し、一つのタスクに集中します。"
        />
      </CardHeader>

      {/* タイマー + プログレス */}
      <CardContent className="flex flex-col items-center gap-4">
        <div className="size-56">
          <CircularProgressbar
            value={percent}
            text={formatTime(time)}
            strokeWidth={6}
            className="focus-progress"
            styles={buildStyles({
              textColor: "var(--foreground)",
              pathColor: "var(--primary)",
              trailColor: "var(--border)",
            })}
          />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isRunning ? "カウント中…" : "一時停止中"}
        </p>
      </CardContent>

      {/* ボタン群 */}
      <CardFooter className="flex-wrap justify-center gap-3">
        <Button onClick={toggleRunning} size="lg" className="min-w-32">
          {isRunning ? <Pause /> : <Play />}
          {isRunning ? "一時停止" : "再開"}
        </Button>

        {/* 中断ダイアログ（Trigger を置くことで、閉じた後にフォーカスがボタンへ戻る） */}
        <Dialog
          open={showInterruptDialog}
          onOpenChange={(open) => {
            if (open) {
              onClickInterrupt();
            } else {
              // Esc / 背景クリックはキャンセル扱い（停止状態のまま）
              setShowInterruptDialog(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="lg">
              <Square />
              中断
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="bg-card">
            <DialogHeader>
              <DialogTitle>セッションを中断しますか？</DialogTitle>
              <DialogDescription>
                タスクは完了になりません。セッションを中断しますか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  // キャンセルは何もしない（そのまま停止状態）
                  setShowInterruptDialog(false);
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // 続ける: ダイアログ閉じて再開
                  setShowInterruptDialog(false);
                  setIsRunning(true);
                }}
              >
                続ける
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowInterruptDialog(false);
                  onConfirmInterruptReturn();
                }}
              >
                中断して戻る
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 完了ダイアログ */}
        <Dialog
          open={showCompleteDialog}
          onOpenChange={(open) => {
            if (open) {
              onClickComplete();
            } else {
              setShowCompleteDialog(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="lg">
              <CheckCircle2 />
              終了（完了）
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="bg-card">
            <DialogHeader>
              <DialogTitle>タスクを完了しますか？</DialogTitle>
              <DialogDescription>
                タスクが完了になります。セッションを終了しますか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCompleteDialog(false);
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // 続ける: ダイアログ閉じて再開
                  setShowCompleteDialog(false);
                  setIsRunning(true);
                }}
              >
                続ける
              </Button>
              <Button
                onClick={() => {
                  // 完了して戻る
                  onConfirmComplete();
                }}
              >
                完了して戻る
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
