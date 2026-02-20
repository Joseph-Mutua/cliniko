import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Card(props: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section className="cc-card">
      <header>
        <h2>{props.title}</h2>
        {props.subtitle ? <p>{props.subtitle}</p> : null}
      </header>
      <div>{props.children}</div>
    </section>
  );
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`cc-button ${props.className ?? ""}`.trim()} />;
}
