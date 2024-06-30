import React from "react";
import Link from "next/link";
import { Github, ArrowUpRight } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 w-full border-t border-white/[0.06] py-8 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-zinc-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-zinc-300">
            <span className="text-primary">M</span>OODIFY
          </span>
          <span>·</span>
          <span>© {currentYear}</span>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="https://github.com/tanisheesh/Moodify"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <Github size={14} />
            Source
          </Link>
          <span className="text-zinc-700">/</span>
          <Link
            href="https://tanisheesh.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Tanish Poddar
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
