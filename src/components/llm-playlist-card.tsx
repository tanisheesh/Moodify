import Link from 'next/link';
import { ListMusic, Search, ExternalLink } from 'lucide-react'; // Added ExternalLink
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Playlist } from '@/app/actions'; // Import the Playlist type from actions.ts
import { cn } from '@/lib/utils';

interface LlmPlaylistCardProps {
  playlist: Playlist;
}

export function LlmPlaylistCard({ playlist }: LlmPlaylistCardProps) {
  // Generate a YouTube Music search URL based on the playlist name
  const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(playlist.name + ' playlist')}`;

  return (
    <Card className={cn(
        "w-full overflow-hidden shadow-lg hover:shadow-primary/30 transition-all duration-300 flex flex-col justify-between h-full", // Added h-full
        "bg-gradient-to-br from-card via-card/90 to-background/80 border border-border/50 rounded-lg backdrop-blur-sm"
    )}>
       <CardHeader className="p-4">
         <div className="flex items-start gap-3 mb-2"> {/* Adjusted alignment */}
           <ListMusic className="text-primary mt-1 flex-shrink-0" size={24} />
           <div>
             <CardTitle className="text-xl font-semibold leading-tight" title={playlist.name}>
               {playlist.name}
             </CardTitle>
             <CardDescription className="text-sm mt-1">{playlist.description}</CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent className="p-4 pt-0 flex-grow">
         {/* Content can be minimal */}
         <p className="text-xs text-muted-foreground italic">AI suggested theme based on your vibe.</p>
       </CardContent>
       <CardFooter className="p-3 pt-0 mt-auto"> {/* Added mt-auto to push footer down */}
         <Button
            variant="outline" // Keep outline for secondary action feel
            size="sm"
            className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary transition-all duration-200 transform hover:scale-[1.02]"
            asChild
         >
           <Link href={youtubeMusicSearchUrl} target="_blank" rel="noopener noreferrer">
             <Search size={16}/> Find on YouTube Music <ExternalLink size={14} className="opacity-70"/>
           </Link>
         </Button>
       </CardFooter>
    </Card>
  );
}
