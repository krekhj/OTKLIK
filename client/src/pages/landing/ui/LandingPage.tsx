import { Footer } from "@/widgets/footer";
import { Header } from "@/widgets/header";
import { Hero } from "@/widgets/hero";
import { HowItWorks } from "@/widgets/how-it-works";
import { Setup } from "@/widgets/setup";

export const LandingPage = () => (
  <>
    <Header />
    <main>
      <Hero />
      <HowItWorks />
      <Setup />
    </main>
    <Footer />
  </>
);
