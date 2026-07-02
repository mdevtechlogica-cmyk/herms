import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getPostLoginPath, isAllowedAppUser } from "@/lib/auth-access";
import { readOAuthErrorFromUrl, clearOAuthParamsFromUrl, getOAuthReturnKind } from "@/lib/google-auth";
import { useLocale } from "@/lib/locale-context";
import { COUNTRIES, COUNTRY_LIST, LANGUAGE_LABELS, type CountryCode, type LanguageCode, allAvailableLanguages } from "@/lib/locale/countries";
import { LanguageSelect } from "@/components/LanguageSelect";
import { SUBSCRIPTION_MONTHLY_PRICE } from "@/lib/plans";
import { useCountUp } from "@/hooks/use-count-up";
import { useInView } from "@/hooks/use-in-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { TechlogicaAbout } from "@/components/TechlogicaAbout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Construction,
  Menu,
  X,
  ArrowRight,
  Check,
  Layers,
  Calendar,
  Wrench,
  FileText,
  Users,
  TrendingUp,
  Smartphone,
  ShieldCheck,
  Info,
  Building,
  CreditCard,
  Crown,
  ChevronDown,
  Globe,
  Languages
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HERMS — Heavy Equipment Rental Management System" },
      { name: "description", content: "Enterprise cloud platform for managing construction machinery fleets, rental bookings, preventative maintenance, and automated invoicing." },
      { property: "og:title", content: "HERMS — Heavy Equipment Rental Management System" },
      { property: "og:description", content: "Enterprise cloud platform for managing construction machinery fleets, rental bookings, preventative maintenance, and automated invoicing." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();
  const { country, language, setCountry, setLanguage, formatMoney, t: messages } = useLocale();
  const t = messages.landing;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [slow, setSlow] = useState(false);
  
  const languageOptions = allAvailableLanguages();

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const kind = getOAuthReturnKind();
    if (kind === "callback") {
      const params = new URLSearchParams(window.location.search);
      nav({
        to: "/auth/callback",
        search: Object.fromEntries(params.entries()),
        replace: true,
      });
      return;
    }
    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      toast.error(oauthError);
      clearOAuthParamsFromUrl();
      nav({ to: "/auth", replace: true });
    }
  }, [nav]);

  useEffect(() => {
    if (loading) return;
    // Auto-redirect authenticated team members (admin/employee) to their workspace
    if (user && isAllowedAppUser(role)) {
      nav({ to: getPostLoginPath(), replace: true });
    }
  }, [user, role, loading, nav]);

  // Dynamic pricing based on selected country
  const prices = SUBSCRIPTION_MONTHLY_PRICE[country];

  const { ref: statsRef, inView: statsInView } = useInView();
  const { ref: featuresRef, inView: featuresInView } = useInView();
  const statUptime = useCountUp(99.9, statsInView, { decimals: 1 });
  const statBookings = useCountUp(10000, statsInView);
  const statCategories = useCountUp(50, statsInView);

  const isMobile = useIsMobile();
  const heroRef = useRef<HTMLElement>(null);
  const [heroEntered, setHeroEntered] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeroEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setParallaxY(0);
      return;
    }

    const onScroll = () => {
      setParallaxY(window.scrollY * 0.3);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading && user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-sidebar text-accent mx-auto">
            <Construction className="h-6 w-6 animate-bounce" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Verifying session...</p>
          {slow && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Taking longer than usual. Check your internet connection or dev server.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Go to sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-accent/30 selection:text-foreground">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sidebar text-accent">
              <Construction className="h-5 w-5" />
            </div>
            <span className="font-bold font-heading text-xl tracking-tight text-foreground">HERMS</span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/75">
            <button onClick={() => scrollToSection("features")} className="hover:text-accent transition-colors cursor-pointer">{t.navFeatures}</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-accent transition-colors cursor-pointer">{t.navPricing}</button>
            <button onClick={() => scrollToSection("mobile")} className="hover:text-accent transition-colors cursor-pointer">{t.navMobile}</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-accent transition-colors cursor-pointer">{t.navFaq}</button>
          </nav>

          {/* Language & Region Selectors */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-foreground/75 hover:text-accent hover:bg-muted transition-colors">
                <Languages className="h-4 w-4" />
                <span>{LANGUAGE_LABELS[language]}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-card border border-white/10 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-72 overflow-y-auto">
                <div className="py-1">
                  {languageOptions.map((code) => (
                    <button
                      key={code}
                      onClick={() => setLanguage(code)}
                      className={`w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors ${language === code ? "bg-accent/15 text-accent" : ""}`}
                    >
                      {LANGUAGE_LABELS[code]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Region/Currency Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-foreground/75 hover:text-accent hover:bg-muted transition-colors">
                <Globe className="h-4 w-4" />
                <span>{COUNTRIES[country].name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-card border border-white/10 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-64 overflow-y-auto">
                <div className="py-1">
                  {COUNTRY_LIST.map((c) => (
                    <button 
                      key={c.code} 
                      onClick={() => setCountry(c.code)}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      {c.name} ({c.currency})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-foreground hover:text-accent">
              <Link to="/auth">{t.navSignIn}</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent hover:bg-accent/95 text-accent-foreground font-semibold">
              <Link to="/auth" search={{ mode: "signup" }}>{t.navStartTrial}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-foreground/75 hover:text-accent hover:bg-muted focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-background px-4 pt-2 pb-6 space-y-4">
            <div className="flex flex-col gap-3 font-medium text-foreground/75">
              <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-accent transition-colors">{t.navFeatures}</button>
              <button onClick={() => scrollToSection("pricing")} className="text-left py-2 hover:text-accent transition-colors">{t.navPricing}</button>
              <button onClick={() => scrollToSection("mobile")} className="text-left py-2 hover:text-accent transition-colors">{t.navMobile}</button>
              <button onClick={() => scrollToSection("faq")} className="text-left py-2 hover:text-accent transition-colors">{t.navFaq}</button>
            </div>
            
            {/* Mobile Language & Region Selectors */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t.languageLabel}</label>
                <LanguageSelect
                  value={language}
                  options={languageOptions}
                  onChange={setLanguage}
                  className="gap-1.5"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t.regionLabel}</label>
                <select 
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-3 py-2 rounded-md text-xs font-medium bg-muted text-foreground border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {COUNTRY_LIST.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-center border-white/15">
                <Link to="/auth">{t.navSignIn}</Link>
              </Button>
              <Button asChild className="w-full justify-center bg-accent text-accent-foreground font-semibold">
                <Link to="/auth" search={{ mode: "signup" }}>{t.navStartTrial}</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero — public/images/hero-equipment.jpg (Unsplash: excavator sunset silhouette) */}
      <section
        ref={heroRef}
        className="relative min-h-[85vh] flex items-center overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="/images/hero-equipment.jpg"
            alt="Excavator silhouetted at a construction site during sunset"
            className="absolute inset-0 h-[120%] w-full object-cover object-[72%_42%] sm:object-[68%_40%] will-change-transform"
            style={isMobile ? undefined : { transform: `translate3d(0, ${parallaxY}px, 0)` }}
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {/* Overlay: graphite left (headline), fade right so amber sunset + machinery show through */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[oklch(0.16_0.015_265/0.92)] via-[oklch(0.18_0.015_265/0.78)] to-[oklch(0.18_0.015_265/0.55)] md:from-[oklch(0.16_0.015_265/0.95)] md:via-[oklch(0.18_0.015_265/0.72)] md:to-[oklch(0.18_0.015_265/0.15)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[oklch(0.13_0.01_265/0.55)] via-[oklch(0.13_0.01_265/0.15)] to-transparent md:from-[oklch(0.13_0.01_265/0.45)] md:via-transparent"
          aria-hidden
        />

        <div
          className={cn(
            "relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 md:pt-40 md:pb-28 space-y-8 text-center md:text-left transition-all duration-700 delay-100",
            heroEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-foreground text-xs font-semibold tracking-wide uppercase">
            <Badge variant="outline" className="bg-accent/20 text-accent border-none text-[10px] px-2 py-0">{t.heroBadge}</Badge>
            {t.heroBadgeText}
          </div>

          <div className="max-w-4xl mx-auto md:mx-0 space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-heading tracking-tight leading-[1.1] text-foreground">
              {t.heroTitle}{" "}
              <span className="bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-foreground/85 max-w-2xl md:max-w-xl mx-auto md:mx-0 leading-relaxed">
              {t.heroDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 bg-accent hover:bg-accent/95 text-accent-foreground text-base font-semibold shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t.heroStartTrial} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button onClick={() => scrollToSection("features")} variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-medium border-white/35 text-foreground bg-transparent hover:bg-white/10 hover:text-foreground transition-all">
              {t.heroExplore}
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section ref={statsRef} className="border-y border-white/10 bg-muted/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x md:divide-white/10">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold font-heading font-mono text-accent">{statUptime.toFixed(1)}%</div>
              <p className="text-sm text-foreground/70 font-medium">{t.stat1Label}</p>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl font-extrabold font-heading font-mono text-accent">
                {statBookings >= 10000 ? "10k+" : `${Math.round(statBookings)}`}
              </div>
              <p className="text-sm text-foreground/70 font-medium">{t.stat2Label}</p>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl font-extrabold font-heading font-mono text-accent">{Math.round(statCategories)}+</div>
              <p className="text-sm text-foreground/70 font-medium">{t.stat3Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet photo gallery */}
      <section className="py-14 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold text-accent uppercase tracking-widest">Built for the field</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-foreground tracking-tight">
              Heavy equipment, real job sites
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                src: "/images/hero-equipment.jpg",
                alt: "Excavators silhouetted against a sunset at a construction site",
                title: "Fleet dispatch",
                caption: "Coordinate rentals when the day ends but work continues",
              },
              {
                src: "/images/fleet-night.jpg",
                alt: "Komatsu excavator with work lights on at night",
                title: "Night operations",
                caption: "Track equipment and crews through late shifts",
              },
              {
                src: "/images/fleet-yard.jpg",
                alt: "Yellow excavator on a gravel yard at a rental site",
                title: "Yard management",
                caption: "Catalog, inspect, and allocate machinery from the yard",
              },
            ].map((photo) => (
              <figure
                key={photo.src}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.01_265/0.92)] via-[oklch(0.16_0.015_265/0.35)] to-transparent" />
                  <figcaption className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="font-bold font-heading text-foreground text-lg">{photo.title}</h3>
                    <p className="text-sm text-foreground/75 mt-1">{photo.caption}</p>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.featuresBadge}</h2>
          <p className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground tracking-tight">
            {t.featuresTitle}
          </p>
          <p className="text-foreground/75 max-w-2xl mx-auto">
            {t.featuresDescription}
          </p>
        </div>

        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <Layers className="h-6 w-6 text-accent" />,
              title: t.feature1Title,
              description: t.feature1Desc,
            },
            {
              icon: <Calendar className="h-6 w-6 text-accent" />,
              title: t.feature2Title,
              description: t.feature2Desc,
            },
            {
              icon: <Wrench className="h-6 w-6 text-accent" />,
              title: t.feature3Title,
              description: t.feature3Desc,
            },
            {
              icon: <FileText className="h-6 w-6 text-accent" />,
              title: t.feature4Title,
              description: t.feature4Desc,
            },
            {
              icon: <Users className="h-6 w-6 text-accent" />,
              title: t.feature5Title,
              description: t.feature5Desc,
            },
            {
              icon: <TrendingUp className="h-6 w-6 text-accent" />,
              title: t.feature6Title,
              description: t.feature6Desc,
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                "fade-up group relative bg-card p-6 rounded-xl border border-white/10 hover:border-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between",
                featuresInView && "visible",
              )}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 group-hover:bg-accent/15 transition-colors flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="font-bold font-heading text-lg text-foreground">{feature.title}</h3>
                <p className="text-sm text-foreground/75 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capacitor Mobile Showcase Section */}
      <section id="mobile" className="relative py-20 border-y border-white/10 overflow-hidden">
        <img
          src="/images/fleet-night.jpg"
          alt="Komatsu excavator with work lights on at night"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-none font-semibold">{t.mobileBadge}</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground tracking-tight">
              {t.mobileTitle}
            </h2>
            <p className="text-foreground/75 leading-relaxed">
              {t.mobileDescription}
            </p>
            <ul className="space-y-4">
              {[
                { title: t.mobileFeature1Title, desc: t.mobileFeature1Desc },
                { title: t.mobileFeature2Title, desc: t.mobileFeature2Desc },
                { title: t.mobileFeature3Title, desc: t.mobileFeature3Desc },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-accent/15 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                    <p className="text-xs text-foreground/70 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative justify-self-center w-full max-w-[300px]">
            <div className="hidden sm:block absolute -left-8 -top-6 w-40 h-28 rounded-xl overflow-hidden border border-white/10 shadow-xl rotate-[-6deg] opacity-90">
              <img
                src="/images/fleet-yard.jpg"
                alt="Excavator on a rental yard"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

          {/* Pure HTML CSS Mockup Mobile Phone */}
          <div className="relative justify-self-center w-[300px] h-[600px] rounded-[40px] border-[12px] border-white/15 bg-card shadow-2xl overflow-hidden flex flex-col mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-background rounded-b-2xl z-20 flex items-center justify-center">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Mobile Content */}
            <div className="flex-1 flex flex-col pt-8 bg-muted/40">
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-card">
                <span className="font-bold text-xs text-foreground">{t.mobileFieldApp}</span>
                <span className="px-1.5 py-0.5 bg-success/15 text-success rounded text-[9px] font-semibold">{t.mobileOnline}</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="bg-card rounded-lg border border-white/10 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-foreground/70">{t.mobileBranch}</span>
                    <span className="text-[10px] font-bold text-accent">{t.mobileDispatch}</span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground">{t.mobileCheckoutTitle}</h4>
                  <p className="text-[10px] text-foreground/70">{t.mobileJobsite}</p>
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    {[t.mobileCheck1, t.mobileCheck2, t.mobileCheck3].map((label, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[10px]">
                        <input type="checkbox" defaultChecked={idx < 2} className="rounded border-white/20 text-accent focus:ring-accent h-3.5 w-3.5" />
                        <span className="text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-white/10 p-3 space-y-2">
                  <h4 className="font-bold text-xs text-foreground">{t.mobileSignTitle}</h4>
                  <div className="h-20 rounded bg-muted/50 border border-dashed border-white/15 flex items-center justify-center relative overflow-hidden">
                    <span className="text-[10px] text-foreground/50 select-none">{t.mobileSignPlaceholder}</span>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80">
                      <path d="M 30,50 Q 60,20 100,55 T 170,40" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/70" />
                    </svg>
                  </div>
                  <Button size="sm" className="w-full text-[10px] h-8 bg-accent hover:bg-accent/95 text-accent-foreground font-semibold">
                    {t.mobileComplete}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.pricingBadge}</h2>
          <p className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground tracking-tight">
            {t.pricingTitle}
          </p>
          <p className="text-foreground/75 max-w-2xl mx-auto">
            {t.pricingDescription}
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Basic Plan */}
          <div className="rounded-2xl border border-white/10 bg-card p-6 flex flex-col justify-between hover:border-accent/30 transition-all duration-300 shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.pricingBasic}</h3>
                <p className="text-sm text-foreground/70 mt-1">{t.pricingBasicDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold font-mono text-accent">{formatMoney(prices.basic)}</span>
                <span className="text-foreground/70 text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit1, t.pricingBenefit2, t.pricingBenefit3, t.pricingBenefit4].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-accent hover:bg-accent/95 text-accent-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChooseBasic}</Link>
            </Button>
          </div>

          {/* Intermediate Plan (Recommended) */}
          <div className="relative rounded-2xl border-2 border-accent bg-card p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 shadow-md shadow-accent/10">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow">
              <Crown className="h-3 w-3" /> {t.pricingRecommended}
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.pricingIntermediate}</h3>
                <p className="text-sm text-foreground/70 mt-1">{t.pricingIntermediateDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold font-mono text-accent">{formatMoney(prices.intermediate)}</span>
                <span className="text-foreground/70 text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit5, t.pricingBenefit6, t.pricingBenefit7, t.pricingBenefit8, t.pricingBenefit9].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-accent hover:bg-accent/95 text-accent-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChooseIntermediate}</Link>
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-2xl border border-white/10 bg-card p-6 flex flex-col justify-between hover:border-accent/30 transition-all duration-300 shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.pricingPremium}</h3>
                <p className="text-sm text-foreground/70 mt-1">{t.pricingPremiumDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold font-mono text-accent">{formatMoney(prices.premium)}</span>
                <span className="text-foreground/70 text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit10, t.pricingBenefit11, t.pricingBenefit12, t.pricingBenefit13].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-accent hover:bg-accent/95 text-accent-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChoosePremium}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-28 bg-muted/30 border-y border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.faqBadge}</h2>
            <p className="text-3xl font-extrabold font-heading text-foreground tracking-tight">{t.faqTitle}</p>
          </div>

          <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-white/10 p-6 divide-y divide-white/10">
            {[
              { value: "item-1", question: t.faq1Question, answer: t.faq1Answer },
              { value: "item-2", question: t.faq2Question, answer: t.faq2Answer },
              { value: "item-3", question: t.faq3Question, answer: t.faq3Answer },
              { value: "item-4", question: t.faq4Question, answer: t.faq4Answer },
              { value: "item-5", question: t.faq5Question, answer: t.faq5Answer },
            ].map((item) => (
              <AccordionItem key={item.value} value={item.value} className="border-none">
                <AccordionTrigger className="text-base font-bold text-foreground hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/75 leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative rounded-3xl p-8 sm:p-12 md:p-16 overflow-hidden shadow-2xl text-foreground border border-white/10">
          <img
            src="/images/fleet-yard.jpg"
            alt="Excavator on a gravel rental yard"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-35"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.16_0.015_265/0.92)] via-[oklch(0.18_0.015_265/0.85)] to-[oklch(0.18_0.015_265/0.75)]" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
              {t.ctaTitle}
            </h2>
            <p className="text-foreground/85 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              {t.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 bg-accent hover:bg-accent/95 text-accent-foreground font-bold shadow-lg shadow-accent/20">
                <Link to="/auth" search={{ mode: "signup" }}>{t.ctaStartTrial}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 border-white/35 text-foreground bg-transparent hover:bg-white/10 hover:text-foreground font-medium">
                <Link to="/auth">{t.ctaSignIn}</Link>
              </Button>
            </div>
            <p className="text-xs text-foreground/65">
              {t.ctaNoCard}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded bg-sidebar text-accent">
                <Construction className="h-4 w-4" />
              </div>
              <span className="font-bold font-heading text-lg text-foreground tracking-tight">HERMS</span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-foreground/70">
              <button onClick={() => scrollToSection("features")} className="hover:text-accent transition-colors">{t.navFeatures}</button>
              <button onClick={() => scrollToSection("pricing")} className="hover:text-accent transition-colors">{t.navPricing}</button>
              <button onClick={() => scrollToSection("mobile")} className="hover:text-accent transition-colors">{t.navMobile}</button>
              <button onClick={() => scrollToSection("faq")} className="hover:text-accent transition-colors">{t.navFaq}</button>
            </div>

            <div className="text-xs text-foreground/60">
              {t.footerCopyright.replace("{year}", String(new Date().getFullYear()))}
            </div>
          </div>

          <TechlogicaAbout variant="footer" />
        </div>
      </footer>
    </div>
  );
}

