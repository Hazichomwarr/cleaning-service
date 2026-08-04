import FinalCTA from "@/components/landing/FinalCTA";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ServicesSection from "@/components/landing/ServicesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import TrustBar from "@/components/landing/TrustBar";
import Footer from "@/components/layout/Footer";
import LandingNavbar from "@/components/layout/LandingNavbar";

export default function HomePage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <Hero />
        <TrustBar />
        <ServicesSection />
        <HowItWorks />
        {/* <TestimonialsSection /> */}
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
