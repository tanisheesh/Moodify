import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans'; // Correct import for Geist Sans
import { GeistMono } from 'geist/font/mono'; // Correct import for Geist Mono
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { cn } from "@/lib/utils"; // Import cn utility

export const metadata: Metadata = {
  title: 'Moodify', // Update title
  description: 'Get music recommendations based on your mood.', // Update description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Keep 'dark' class on html for global theme scoping
    <html lang="en" className="dark" suppressHydrationWarning>
      {/* Apply font variables and base styling to the body */}
      <body
        className={cn(
          "antialiased", // Base antialiasing
          GeistSans.variable, // Apply Geist Sans variable
          GeistMono.variable // Apply Geist Mono variable
        )}
      >
        {children}
        <Toaster /> {/* Add Toaster component */}
      </body>
    </html>
  );
}
