"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { genres } from "@/config/genres"; // Import full genres list
import { cn } from "@/lib/utils";
import { Grid3X3 } from "lucide-react";

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenreChange: (genre: string, checked: boolean) => void;
}

// Define a curated list of popular/common genres to show initially
const initialVisibleGenres = [
  "pop", "rock", "hip-hop", "electronic", "jazz", "classical", "country",
  "r-n-b", "folk", "indie", "metal", "blues", "reggae", "latin", "k-pop",
  "ambient", "chill", "dance"
];

// Ensure initialVisibleGenres contains valid genres from the main list
const validInitialGenres = initialVisibleGenres.filter(g => genres.includes(g));

export function GenreSelector({ selectedGenres, onGenreChange }: GenreSelectorProps) {
  const [showAll, setShowAll] = React.useState(false);

  const genresToShow = showAll ? genres : validInitialGenres;

  return (
    <Card className="w-full shadow-xl bg-card/80 backdrop-blur-sm border-border/50 text-left">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Grid3X3 size={24} className="text-primary"/> Choose Your Genres</CardTitle>
        <CardDescription>Select genres that match your taste.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 transition-all duration-300 ease-in-out",
          !showAll ? "max-h-[180px] overflow-hidden" : "max-h-full" // Adjust max-h as needed
        )}>
          {genresToShow.map((genre) => (
            <div key={genre} className="flex items-center space-x-2 group">
              <Checkbox
                id={genre}
                checked={selectedGenres.includes(genre)}
                onCheckedChange={(checked) => onGenreChange(genre, checked as boolean)}
                aria-labelledby={`label-${genre}`}
                className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-colors"
              />
              <Label
                htmlFor={genre}
                id={`label-${genre}`}
                className="text-sm font-medium capitalize cursor-pointer select-none group-hover:text-primary transition-colors"
              >
                {genre.replace(/-/g, " ")} {/* Replace hyphens with spaces for display */}
              </Label>
            </div>
          ))}
        </div>
         <Button
            variant="link"
            className="mt-4 p-0 h-auto text-primary hover:text-primary/80"
            onClick={() => setShowAll(!showAll)}
         >
            {showAll ? "Show Fewer Genres" : "Show More Genres..."}
         </Button>
      </CardContent>
    </Card>
  );
}
