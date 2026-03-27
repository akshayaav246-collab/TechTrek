import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-secondary text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-heading font-bold text-xl text-primary mb-4">TechTrek</h3>
          <p className="text-sm text-white/80">
            Empowering tech enthusiasts to discover, attend, and host the best technology events around the world.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-4 font-heading">Quick Links</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link href="/events" className="hover:text-primary transition-colors">Events</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4 font-heading">Contact Info</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li>Global Knowledge Technologies</li>
            <li>+91 8043003611</li>
            <li>genquiry@globalknowledgetech.com</li>
            <li>1st Floor, 81, The Hulkul, 37, Lavelle Road, Shanthala Nagar, Bangalore - 560001</li>
          </ul>
        </div>
      </div>
      <div className="w-full mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/60">
        &copy; {new Date().getFullYear()} TechTrek. All rights reserved.
      </div>
    </footer>
  );
}
