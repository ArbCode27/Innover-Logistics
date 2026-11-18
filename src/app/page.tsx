import React from "react";
import { Navbar } from "@/components/landing/navbar";
import { HeroBackground } from "@/components/landing/hero-background";
import { HeroInteractive } from "@/components/landing/hero-interactive";
import { ImpactMetrics } from "@/components/landing/impact-metrics";
import { FeatureBento } from "@/components/landing/feature-bento";
import { WorkflowTimeline } from "@/components/landing/workflow-timeline";
import { SecuritySection } from "@/components/landing/security-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased selection:bg-royal/20 selection:text-royal">
      {/* Background layer with atmospheric glows and topomap contours */}
      <HeroBackground />

      {/* Floating Centered Pill Navbar */}
      <Navbar />

      <main id="plataforma" className="relative z-10 flex flex-col">
        {/* Full-viewport Hero with SyncDepth-inspired composition */}
        <HeroInteractive />

        {/* Section 1: Glass Impact Metrics Counter Strip */}
        <ImpactMetrics />

        {/* Section 2: Spotlight Bento Grid of 4 Core Modules */}
        <FeatureBento />

        {/* Section 3: 5-step Workflow from Warehouse to Field Crew */}
        <WorkflowTimeline />

        {/* Section 4: Enterprise Security & Reliability Section */}
        <SecuritySection />

        {/* Section 5: High-conversion Final CTA */}
        <FinalCTA />
      </main>

      {/* Corporate Footer */}
      <Footer />
    </div>
  );
}
