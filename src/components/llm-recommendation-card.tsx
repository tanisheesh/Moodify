import Image from 'next/image';
import Link from 'next/link';
import { Youtube, Music2, ExternalLink } from 'lucide-react'; // Added ExternalLink
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Song } from '@/app/actions'; // Import the updated Song type from actions.ts
import { cn } from '@/lib/utils';

interface LlmRecommendationCardProps {
  song: Song; // Updated type, no longer expects youtubeMusicUrl
}

export function LlmRecommendationCard({ song }: LlmRecommendationCardProps) {
  // Placeholder image logic using picsum with consistent seed
  const placeholderImageUrl = `https://picsum.photos/seed/${encodeURIComponent(song.name + song.artist).substring(0, 50)}/300/300`;

  // Generate YouTube Music search URL dynamically
  const searchQuery = `${song.name} ${song.artist}`;
  const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;


  return (
    <Card className={cn(
        "w-full overflow-hidden shadow-lg hover:shadow-primary/30 transition-all duration-300 flex flex-col justify-between",
        "bg-gradient-to-br from-card via-card/90 to-background/80 border border-border/50 rounded-lg backdrop-blur-sm"
    )}>
       <CardHeader className="p-0 relative group">
         <Image
           src={placeholderImageUrl}
           alt={`Placeholder art for ${song.name}`}
           width={300}
           height={300}
           className="w-full h-auto aspect-square object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
           unoptimized // Added to prevent potential build issues with dynamic picsum URLs
         />
         {/* Optional Overlay on hover */}
         <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-t-lg">
            <Music2 size={48} className="text-white/80" />
         </div>
       </CardHeader>
       <CardContent className="p-4 flex-grow">
         <CardTitle className="text-base font-semibold truncate mb-1" title={song.name}>{song.name}</CardTitle>
         <p className="text-xs text-muted-foreground truncate" title={song.artist}>{song.artist}</p>
       </CardContent>
       <CardFooter className="p-3 pt-0">
         <Button
            variant="default"
            size="sm"
            className="w-full gap-2 bg-primary/90 hover:bg-primary text-primary-foreground transition-all duration-200 transform hover:scale-[1.02]"
            asChild
         >
           {/* Update href to use the generated search URL */}
           <Link href={youtubeMusicSearchUrl} target="_blank" rel="noopener noreferrer">
             <Youtube size={16} /> Listen <ExternalLink size={14} className="opacity-70"/>
           </Link>
         </Button>
       </CardFooter>
    </Card>
  );
}
