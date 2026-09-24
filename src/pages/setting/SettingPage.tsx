import { Info } from "lucide-react";

import { SectionHeader } from "@/components/common/SectionHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        as="h1"
        eyebrow="Setting"
        title="設定"
        description="現在は、認証やバックエンド接続を使わずに画面を確認できるデモモードです。"
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
        <CardContent className="text-sm text-muted-foreground">
          これらは一時的に無効化しています。データ設計を確定してから、この画面に設定機能を戻します。
        </CardContent>
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
