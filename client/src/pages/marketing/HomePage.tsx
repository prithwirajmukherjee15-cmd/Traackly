import { useEffect } from 'react';
import { MarketingFooter, MarketingNav } from './Chrome';
import { Facts, Faq, FinalCta, Flow, GiantMarquee, Trust } from './SectionsBottom';
import { FeatureCarousel, NothingSilent } from './SectionsMid';
import { EverySeat, Hero, IndustryMarquee } from './SectionsTop';

/** Public homepage shown to logged-out visitors at "/". */
export function HomePage() {
  useEffect(() => {
    document.title = 'Traackly — every request, from order desk to shop floor';
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => {
      html.style.scrollBehavior = prev;
      document.title = 'Traackly';
    };
  }, []);
  return (
    <div className="min-h-full bg-white font-display text-black">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main">
        <Hero />
        <IndustryMarquee />
        <EverySeat />
        <FeatureCarousel />
        <NothingSilent />
        <Trust />
        <Flow />
        <Facts />
        <GiantMarquee />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
