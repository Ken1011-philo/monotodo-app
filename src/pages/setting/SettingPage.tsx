import { Info } from "lucide-react";

import { SectionHeader } from "@/components/common/SectionHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingPage() {
  return (
    // 設定項目は少ないため、GitHub の設定画面と同様に読みやすい幅（768px）で左寄せにする
    <div className="flex max-w-3xl flex-col gap-6">
      <SectionHeader
        as="h1"
        eyebrow="Setting"
        title="設定"
      />

      <Card>
        <CardHeader>
          <CardTitle>バックエンド連携</CardTitle>
          <CardDescription>
            Supabase認証、サインアウト、Goalリセット
          </CardDescription>
          <CardAction>
            <Badge variant="outline">無効</Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Alert>
        <Info />
        <AlertDescription>
          Plan画面の編集内容は現在ブラウザ内だけで保持され、再読み込みすると初期状態に戻ります。
        </AlertDescription>
      </Alert>
    </div>
  );
}
