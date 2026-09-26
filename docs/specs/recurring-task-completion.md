# タスク完了（定期タスクを含む）の仕様

- 状態: 採用（フロントエンドのブラウザ内モデルに実装済み。DB は未実装）
- 最終更新: 2026-09-26

## 1. 結論

**完了フラグを毎日リセットしない。完了した事実を「記録」として残し、「今日完了しているか」はその都度計算する。**

- 一回タスク: 完了日時（`completedAt`）を持つ。あれば完了。
- 定期タスク: 完了した**活動日**の記録を持つ。今日の活動日の記録があれば完了、なければ未完了。
- 日付が変わると、今日の記録がまだないため定期タスクは**自然に未完了へ戻る**。リセット処理・定時バッチ・サーバー常駐は不要。

## 2. 用語

| 用語 | 意味 |
|---|---|
| 一回タスク | 一度完了したら終わりのタスク |
| 定期タスク | 毎日やるタスク（UI 上は「定期タスク」、名前の横に繰り返しアイコン） |
| 活動日 | タスクの完了を数える「日」。ユーザーのローカル日付（`YYYY-MM-DD`）で、区切り時刻で切り替わる |
| 区切り時刻 | 活動日が切り替わる時刻。現在は 0 時固定（`DAY_START_HOUR`） |
| 完了記録 | 「どのタスクを、どの活動日に完了したか」の記録 |

## 3. 「今日」（活動日）の決め方

- ユーザーの**ローカル時刻**で判定する（フロントエンドではブラウザのタイムゾーン）。UTC では判定しない。
  - 例: UTC 0 時で区切ると、日本では朝 9 時に日付が変わってしまう。
- 区切り時刻より前は**前日**の活動日とする。
  - 例: 区切り 4 時なら、9/27 3:59 の完了は 9/26 の活動日として記録する（夜更かし時の完了が翌日扱いにならないように）。
- 画面を開いたまま日付をまたいだ場合も表示を更新する。
  - 区切り時刻にタイマーで更新する。
  - スリープ復帰・タブを戻したとき（`focus` / `visibilitychange`）にも判定し直す（スリープ中はタイマーが遅れるため）。

## 4. 完了状態の判定

```
isTaskDone(task, today) =
  定期タスク → task の完了記録に today が含まれる
  一回タスク → task.completedAt が null でない
```

- サブゴールの進み具合 = そのサブゴールのタスクのうち `isTaskDone` のものの数 / 全体数。
- 全タスクが完了したサブゴールは「すべて完了」とする（タスク 0 件は未完了扱い）。

## 5. 操作の仕様

| 操作 | 一回タスク | 定期タスク |
|---|---|---|
| チェックを付ける | `completedAt` に現在日時を入れる | 今日の活動日の完了記録を追加する |
| チェックを外す | `completedAt` を null にする | 今日の活動日の完了記録だけを削除する（過去の記録は残す） |
| 二重にチェック | 状態が変わるだけ（記録は増えない） | 同じ活動日の記録は 1 件まで（重複しない） |
| 日付が変わる | 完了のまま | 未完了に戻る（記録は残る） |

### 種類（一回 ⇔ 定期）を切り替えたとき

**画面に出ている完了状態（今日完了しているか）を引き継ぐ。** 過去の記録は消さない。

- 一回（完了）→ 定期: 今日の活動日の完了記録を追加する（今日は完了のまま）。
- 一回（未完了）→ 定期: 今日の記録は付けない（未完了のまま）。
- 定期（今日完了）→ 一回: `completedAt` に現在日時を入れる（完了のまま）。
- 定期（今日未完了）→ 一回: `completedAt` を null にする（未完了のまま）。

理由: 完了済みのタスクを「定期にする」と操作した瞬間にチェックが外れると、意図しない変化に見えるため。

## 6. 表示の仕様（Plan ページ）

- 今日完了していないタスクは一覧に並ぶ（並べ替え可能）。
- 今日完了しているタスクは下の「完了済み（n）」に畳む（初期状態は閉じる）。チェックを外すと元の位置に戻る。
- 定期タスクは、翌日になると自動で一覧側に戻る。
- ロードマップのサブゴールには「完了数/全体件」を表示し、すべて完了したらノードを ✓ にする。

## 7. データモデル

### 7.1 現在（フロントエンド・ブラウザ内のみ）

`src/features/plan/model/planDraft.ts` の `DraftTask`:

```ts
type DraftTask = {
  id: string;
  title: string;
  isLoop: boolean;            // true: 定期タスク
  completedAt: string | null; // 一回タスクの完了日時（ISO 8601）
  doneOn: ActivityDate[];     // 定期タスクを完了した活動日（YYYY-MM-DD、重複なし）
  createdAt: number;
};
```

`completed` のような真偽値は**持たない**（計算で求める）。

### 7.2 DB（案・未実装）

テーブル名・列名は DB 設計をやり直す際に確定する。考え方は次のとおり。

```
tasks
  id            uuid  PK
  subgoal_id    uuid  FK
  title         text
  kind          text  -- 'once' | 'recurring'
  completed_at  timestamptz NULL   -- 一回タスクの完了日時
  ...

task_completions        -- 定期タスクの完了記録
  task_id     uuid  FK → tasks.id (ON DELETE CASCADE)
  done_on     date        -- 活動日（ユーザーのローカル日付）
  created_at  timestamptz
  PRIMARY KEY (task_id, done_on)   -- 同じ日の二重記録を防ぐ

user_settings
  timezone        text  -- 例: 'Asia/Tokyo'
  day_start_hour  int   -- 区切り時刻（初期値 0）
```

- チェック = `task_completions` に 1 行 INSERT（主キーで重複を防ぐ）、外す = その行を DELETE。
- `done_on` は、ユーザーの `timezone` と `day_start_hour` から求めた活動日を入れる。
  - クライアントが計算して送る方式と、DB 側で `now() AT TIME ZONE timezone` から計算する方式がある。
  - 改ざんを気にするなら DB 側で計算する（個人利用なら前者でもよい）。
- `task_completions` は 1 タスク 1 日 1 行なので、量は小さい。

フロントとの対応: `DraftTask.completedAt` → `tasks.completed_at`、`DraftTask.doneOn` → `task_completions.done_on` の集合。

## 8. 集計の出し方（記録から計算する）

- 今日の完了数: 一回タスクで `completed_at` が今日の活動日に入るもの + `task_completions` で `done_on = 今日` のもの。
- 連続達成日数（ストリーク）: `task_completions` の `done_on` を今日から遡り、途切れるまで数える。
- 集計値をテーブルに保存しておく必要はない（必要になったらビューやキャッシュで対応）。

## 9. 採用しなかった案

| 案 | 内容 | 採用しない理由 |
|---|---|---|
| A. 定時リセット | DB の cron（pg_cron など）で毎日 `completed = false` に戻す | タイムゾーンごとに実行時刻がずれる（UTC 0 時 = 日本の朝 9 時）。止まっていた日はリセットが抜ける。フラグを上書きするため履歴（ストリーク）が消える。定時処理の基盤が別に要る |
| B. 日ごとにタスク行を生成 | 定期タスクのひな形から、活動日ごとの「その日のタスク」行を作る（旧 `domain.ts` の `loop_instance` / `monotodo_aggregate_missing_days`） | 開いていなかった日の分を後から生成する処理が要り、読み込み時に書き込みが発生する。行が増え、仕組みが複雑になる |

参考: Todoist は繰り返しタスクを完了すると次の期日へ進め、Google ToDo リストは完了時に次回分を作る。いずれも「完了の事実を残して次を計算する」考え方で、フラグのリセットはしない。

## 10. 未決事項

- 区切り時刻をユーザー設定にするか（現在は 0 時固定）。
- タイムゾーンを変えた（旅行など）ときの扱い。記録済みの `done_on` はそのままにする想定。
- 「毎週月・水・金」などの繰り返しルール。やる日かどうかをルールから計算し、完了は同じ記録で判定する想定。
- Do / Focus ページとの連携（現在は Do が固定のデモデータ、Focus の完了処理は仮実装で、Plan の完了状態は反映されない）。
- 過去の日の完了記録を後から付け外しできるようにするか。
- 完了記録の保存期間（無期限で問題ない量の想定）。

## 11. 実装の場所

| 役割 | ファイル |
|---|---|
| 活動日の計算（純粋関数） | `src/features/plan/model/activityDate.ts` |
| 完了の判定・切り替え（純粋関数 / reducer） | `src/features/plan/model/planDraft.ts`（`isTaskDone` / `subgoalProgress` / `task/toggleComplete` / `task/toggleLoop`） |
| 今日の活動日の追従 | `src/features/plan/hooks/useToday.ts` |
| 画面への受け渡し | `src/features/plan/hooks/usePlanDraft.ts`（`isDone` / `progressOf`） |
| 表示 | `src/pages/plan/SubgoalTaskPanel.tsx`・`TaskRow.tsx`・`PlanSidebar.tsx` |

旧設計の型（`src/types/domain.ts` の `LoopTaskTemplate` / `TaskKind = "loop_instance"`）と `src/repositories/` は案 B に基づいており、DB 設計のやり直し時に本仕様へ置き換える。
