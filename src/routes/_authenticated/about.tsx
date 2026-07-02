import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { TechlogicaAbout } from "@/components/TechlogicaAbout";
import { useLocale } from "@/lib/locale-context";

export const Route = createFileRoute("/_authenticated/about")({
  component: AboutPage,
});

function AboutPage() {
  const { t } = useLocale();

  return (
    <>
      <PageHeader title={t.about.title} description={t.about.pageDescription} />
      <TechlogicaAbout variant="page" />
    </>
  );
}
