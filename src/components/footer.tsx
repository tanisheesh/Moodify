import React from 'react';
import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 py-8 px-4 w-full max-w-5xl text-center text-sm text-muted-foreground border-t border-border/30">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-2">
        <Link href="https://github.com/tanisheesh/Moodify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
          <Github size={16} /> GitHub Repo
        </Link>
        <span>|</span>
        <span>Copyright Reserved © {currentYear}</span>
      </div>
      <p>Made with ❤️ by <Link href="https://tanisheesh.is-a.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Tanish Poddar</Link></p>
    </footer>
  );
}
