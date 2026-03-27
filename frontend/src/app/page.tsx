import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Input } from "@/components/ui/Input";
import IndustryAwareness from "@/components/sections/IndustryAwareness";
import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-secondary">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-secondary">
          <img
            src="/redfort.png"
            alt="Red Fort Background"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
          />
          <div className="absolute inset-0 bg-secondary/50"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16 md:mt-0">
          <div className="text-white grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 pt-8 md:pt-0">
              <h1 className="font-heading font-extrabold text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-tight tracking-tight">
                TechTrek 2026
              </h1>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#FF8C00] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Ignite Your Imagination
              </h2>
              <p className="text-lg md:text-xl text-white/95 max-w-2xl font-body leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium">
                National AI education platform empowering students across India by bridging the gap between academia and industry through Industry Awareness Summits and aligning with the Viksit Bharat vision.
              </p>
              <div className="flex flex-wrap w-full justify-center lg:justify-start gap-4 mt-6">
                <Link href="/events" className="relative overflow-hidden flex items-center gap-3 rounded-full px-8 py-4 font-bold text-white text-xl bg-gradient-to-r from-[#e8631a] to-[#991B1B] shadow-[0_4px_15px_rgba(232,99,26,0.4)] hover:shadow-[0_6px_20px_rgba(232,99,26,0.6)] hover:scale-[1.03] transition-all duration-300 border border-white/10 group">
                  <span className="absolute top-0 left-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-15deg] group-hover:animate-[shimmer_0.75s_linear_infinite] animate-[shimmer_1.5s_linear_infinite]"></span>
                  <span className="relative z-10 flex items-center gap-3">
                    Explore Events
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </span>
                </Link>
              </div>
            </div>
            
            {/* Right Content */}
            <div className="flex flex-col items-center justify-center lg:items-end w-full h-full">
               <div className="bg-secondary/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                  <div className="w-full h-40 md:h-48 bg-gradient-to-tr from-primary/40 to-accent/40 rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center border border-white/10 shadow-inner">
                    <span className="text-white/90 font-bold tracking-widest text-sm md:text-base uppercase">Event Highlights</span>
                  </div>
                  <p className="text-white/95 text-base md:text-lg font-medium text-center leading-relaxed">
                    Next flagship: <br/><span className="text-primary font-bold text-xl md:text-2xl mt-1 block">TechTrek @ KSRCE</span> <span className="block mt-1">Mar 12, 2026</span>
                  </p>
               </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-150%) skewX(-15deg); }
            100% { transform: translateX(300%) skewX(-15deg); }
          }
        `}</style>
      </section>

      {/* Industry Awareness Section */}
      <IndustryAwareness />

      {/* Testimonials Section */}
      <Section className="bg-secondary text-white py-20 relative overflow-hidden" style={{ maxWidth: '100%' }}>
        <div className="max-w-7xl mx-auto mb-12 px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading font-bold text-4xl mb-4">What Students Say</h2>
          <p className="text-white/70 text-lg">Hear from past attendees who accelerated their careers.</p>
        </div>
        
        {/* Infinite CSS Carousel Container */}
        <div 
          className="slider w-full max-w-7xl mx-auto" 
          style={{ 
            '--width': '400px', 
            '--height': '280px', 
            '--quantity': 5 
          } as React.CSSProperties}
        >
          <div className="list">
            {[
              { name: "Rahul S.", uni: "IIT Delhi", quote: "TechTrek totally changed my perspective on the tech industry. I landed my first internship because of the networks I built here!" },
              { name: "Priya M.", uni: "VIT Vellore", quote: "The hands-on workshops on Cloud Native architectures gave me the exact skills I needed to stand out in my interviews." },
              { name: "Arjun K.", uni: "NIT Trichy", quote: "Meeting mentors from top enterprises was invaluable. The guidance I received helped me shape my career path in AI." },
              { name: "Neha R.", uni: "KSRCE", quote: "An electrifying experience! The energy, the knowledge sharing, and the community are unmatched. A must-attend for tech enthusiasts." },
              { name: "Vikram D.", uni: "BITS Pilani", quote: "I came for the cybersecurity talks and stayed for the incredible networking opportunities. Truly a flagship event." }
            ].map((item, index) => (
              <div 
                key={index} 
                className="item p-4" 
                style={{ '--position': index + 1 } as React.CSSProperties}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full w-full text-white slider-card shadow-lg flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-lg shadow-inner">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      <span className="text-sm text-primary font-medium">{item.uni}</span>
                    </div>
                  </div>
                  <p className="italic text-white/80 leading-snug text-base font-light">"{item.quote}"</p>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .slider {
            width: 100%;
            height: var(--height);
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
          }
          .slider .list {
            display: flex;
            width: 100%;
            min-width: calc(var(--width) * var(--quantity));
            position: relative;
          }
          .slider .list .item {
            width: var(--width);
            height: var(--height);
            position: absolute;
            left: 100%;
            animation: autoRun 30s linear infinite;
            transition: transform 0.4s ease, filter 0.4s ease;
            animation-delay: calc(
              (30s / var(--quantity)) * (var(--position) - 1) - 30s
            ) !important;
            cursor: pointer;
          }
          @keyframes autoRun {
            from { left: 100%; }
            to { left: calc(var(--width) * -1); }
          }
          
          /* Decrease Speed / Pause on Hover */
          .slider:hover .item {
            animation-play-state: paused !important;
          }
          
          /* Enlarge on Hover */
          .slider .list .item:hover {
            transform: scale(1.05);
            z-index: 10;
          }
          
          /* Responsive sizing */
          @media (max-width: 768px) {
            .slider {
              --width: 320px !important;
              --height: 280px !important;
            }
          }
        `}</style>
      </Section>

      {/* Newsletter Section */}
      <Section className="bg-background py-16">
        <div className="max-w-2xl mx-auto text-center bg-card rounded-3xl p-6 md:p-10 border border-border shadow-lg relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="font-heading font-bold text-2xl md:text-3xl mb-4 text-secondary">Ready to Start Your Trek?</h2>
            <p className="text-foreground/70 mb-8 text-sm md:text-base max-w-md mx-auto">
              Subscribe to our newsletter to get the latest updates on upcoming TechTrek events, exclusive mentorship opportunities, and hands-on workshops.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <div className="flex-grow">
                <Input type="email" placeholder="Enter your email address" className="w-full bg-background/50 backdrop-blur-sm text-sm" required />
              </div>
              <Button variant="primary" type="submit" className="whitespace-nowrap text-sm px-6">Subscribe</Button>
            </form>
          </div>
        </div>
      </Section>
    </>
  );
}
