import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * ヘッダーと本文で共有する横幅。
 * 最大 1536px（max-w-384 = 96rem）まで広げ、左右の余白は画面幅に応じて 16 / 24 / 32px。
 * カラムの割り付けは各ページが担う。
 */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-384 px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
