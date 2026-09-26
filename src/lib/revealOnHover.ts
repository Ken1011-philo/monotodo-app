/**
 * 行の操作ボタン（並べ替えハンドル・「︙」メニュー）を、PC ではポインタを乗せたとき・
 * フォーカスがあるとき・メニューを開いているときだけ表示するためのクラス。
 * 行の要素に `group/row` を付けて使う。タッチ端末（md 未満）はホバーがないため常に表示する。
 * 透明にするだけで要素は残すので、キーボード操作や読み上げでは常に届く。
 */
export const revealOnHover =
  "transition-opacity md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:data-[state=open]:opacity-100";
