import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** タイトル上に表示する小見出し（例: "Now"） */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** 見出しレベル。ページタイトルは h1、カード内は h2 を想定 */
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  className?: string;
};

const titleSizes = {
  h1: "text-3xl",
  h2: "text-2xl",
  h3: "text-lg",
} as const;

/** 大文字・字間広めの小ラベル。セクションやフィールドの見出しに使う */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "space-y-2",
        align === "center" && "text-center",
        className
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Heading
        className={cn(
          "font-semibold text-card-foreground",
          titleSizes[Heading]
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
