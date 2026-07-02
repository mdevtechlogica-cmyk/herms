import { Mail, Phone, ExternalLink } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import {
  TECHLOGICA_EMAIL,
  TECHLOGICA_LOGO,
  TECHLOGICA_OFFICES,
  TECHLOGICA_WEBSITE,
} from "@/lib/techlogica";
import { cn } from "@/lib/utils";

type TechlogicaAboutProps = {
  variant?: "footer" | "page" | "compact";
  className?: string;
};

export function TechlogicaAbout({ variant = "page", className }: TechlogicaAboutProps) {
  const { t } = useLocale();
  const labels = t.about;

  const regionLabel = (key: "india" | "dubai") =>
    key === "india" ? labels.india : labels.dubai;

  if (variant === "compact") {
    return (
      <div className={cn("text-center space-y-2", className)}>
        <a
          href={TECHLOGICA_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <img src={TECHLOGICA_LOGO} alt="Techlogica" className="h-5 w-auto" />
          <span>{labels.developedBy}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const officeGrid = (
    <div className={cn("grid gap-8", variant === "footer" ? "sm:grid-cols-2" : "md:grid-cols-2")}>
      {TECHLOGICA_OFFICES.map((office) => (
        <div key={office.id} className="space-y-3">
          <h3 className="text-lg font-bold font-heading text-foreground">{regionLabel(office.regionKey)}</h3>
          <p className="font-semibold text-foreground/90">{office.company}</p>
          <address className="not-italic text-sm text-foreground/70 leading-relaxed space-y-0.5">
            {office.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`mailto:${TECHLOGICA_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-accent transition-colors w-fit"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/10">
                <Mail className="h-4 w-4" />
              </span>
              {TECHLOGICA_EMAIL}
            </a>
            <a
              href={`tel:${office.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-accent transition-colors w-fit"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/10">
                <Phone className="h-4 w-4" />
              </span>
              {office.phone}
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  if (variant === "footer") {
    return (
      <div className={cn("space-y-10", className)}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-4 max-w-sm">
            <a
              href={TECHLOGICA_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img
                src={TECHLOGICA_LOGO}
                alt="Techlogica IT DT solutions"
                className="h-10 w-auto"
              />
            </a>
            <p className="text-sm text-foreground/70 leading-relaxed">{labels.description}</p>
            <a
              href={TECHLOGICA_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              {labels.visitWebsite}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex-1 max-w-3xl">{officeGrid}</div>
        </div>
        <div className="pt-6 border-t border-white/10 text-xs text-foreground/55 text-center sm:text-left">
          {labels.developedBy}{" "}
          <a
            href={TECHLOGICA_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Techlogica
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card p-6 sm:p-8 space-y-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <a
          href={TECHLOGICA_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block shrink-0 rounded-lg bg-black/90 p-3"
        >
          <img src={TECHLOGICA_LOGO} alt="Techlogica" className="h-10 w-auto" />
        </a>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-heading">{labels.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{labels.description}</p>
          <a
            href={TECHLOGICA_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            {labels.visitWebsite}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      {officeGrid}
      <p className="text-xs text-muted-foreground border-t pt-6">
        {labels.hermsNote}
      </p>
    </div>
  );
}
