import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

type CardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}>;

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function cx(...values: Array<string | undefined | null | false>): string {
  return values.filter(Boolean).join(" ");
}

export function Card(props: CardProps) {
  return (
    <section className={cx("cc-card", props.className)}>
      <header className="cc-card-header">
        <div className="cc-card-heading">
          {props.kicker ? <p className="cc-card-kicker">{props.kicker}</p> : null}
          <h2 className="cc-card-title">{props.title}</h2>
          {props.subtitle ? <p className="cc-card-subtitle">{props.subtitle}</p> : null}
        </div>
        {props.actions ? <div className="cc-card-actions">{props.actions}</div> : null}
      </header>
      <div className={cx("cc-card-content", props.contentClassName)}>{props.children}</div>
    </section>
  );
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, ...rest } = props;
  return <button {...rest} className={cx("cc-button", `cc-button--${variant}`, `cc-button--${size}`, className)} />;
}

export { ToastProvider, useToast } from "./toast";
