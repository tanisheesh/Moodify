'use client';

import { useState, useTransition, useRef, useCallback, FormEvent, useActionState, useEffect } from 'react';
import type { ActionResponse, RecommendationResult } from './actions';
import { fetchRecommendations } from './actions';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Label } from "@/components/ui/label"; // Import Label component
import { GenreSelector } from '@/components/genre-selector';
import { LlmRecommendationCard } from '@/components/llm-recommendation-card';
import { LlmPlaylistCard } from '@/components/llm-playlist-card';
import { Footer } from '@/components/footer';
import { SplashScreen } from '@/components/splash-screen';
import { LoadingAnimation } from '@/components/loading-animation'; // Use new LoadingAnimation
import { AlertCircle, Music, ListMusic, Send, Mic, Languages } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { cn } from '@/lib/utils';


const initialState: ActionResponse = {
  success: false,
  message: undefined,
  data: undefined,
  errors: undefined,
};


export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [formState, formAction] = useActionState(fetchRecommendations, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const moodInputRef = useRef<HTMLTextAreaElement>(null);
  const [typedMood, setTypedMood] = useState(''); // State for typing effect

  const { toast } = useToast(); // Initialize toast

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

   const handleGenreChange = (genre: string, checked: boolean) => {
    setSelectedGenres((prev) =>
      checked ? [...prev, genre] : prev.filter((g) => g !== genre)
    );
  };

  // Typing effect for mood description
   useEffect(() => {
     if (formState.success && formState.data?.analysis) {
        const moodDescription = formState.data.analysis; // Use analysis for typing effect source
        let i = 0;
        setTypedMood(''); // Clear previous typed text
        const intervalId = setInterval(() => {
          if (i < moodDescription.length) {
            setTypedMood((prev) => prev + moodDescription.charAt(i));
            i++;
          } else {
            clearInterval(intervalId);
          }
        }, 30); // Adjust speed of typing effect here (milliseconds)

        return () => clearInterval(intervalId); // Cleanup interval on unmount or re-run
     }
   }, [formState.success, formState.data?.analysis]); // Rerun effect when analysis changes


  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); // Prevent default form submission
      const formData = new FormData(event.currentTarget);
      selectedGenres.forEach(genre => formData.append('genres', genre)); // Ensure genres are in FormData
       startTransition(() => {
          formAction(formData);
       });
  };

   // Display form validation errors via toast
   useEffect(() => {
     if (formState.errors && formState.errors.length > 0) {
       formState.errors.forEach(error => {
         toast({
           title: `Input Error: ${error.path.join('.')}`,
           description: error.message,
           variant: "destructive",
         });
       });
     }
     if (formState.message && !formState.success) {
        toast({
           title: "Error",
           description: formState.message,
           variant: "destructive",
        });
     }
   }, [formState.errors, formState.message, formState.success, toast]);


   // Extract data safely after checking success
   const { songs, playlists, analysis } = formState.success && formState.data ? formState.data : { songs: [], playlists: [], analysis: undefined };


  if (showSplash) {
    return <SplashScreen onFinished={handleSplashFinish} />;
  }


  return (
    <div className="flex flex-col min-h-screen items-center bg-gradient-to-b from-background to-gray-950 text-foreground">
      <main className="flex flex-col items-center w-full max-w-5xl flex-1 p-6 md:p-12">
        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-red-400 to-pink-500">
            Moodify
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light">
            Tune into your emotions. We'll find the perfect soundtrack.
          </p>
        </header>

        {/* Form Section */}
        <form ref={formRef} onSubmit={handleSubmit} className="w-full space-y-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mood & Language Card */}
            <Card className="w-full shadow-xl bg-card/80 backdrop-blur-sm border-border/50 text-left">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2"><Mic size={24} className="text-primary"/> How are you feeling?</CardTitle>
                <CardDescription>Describe your current mood and vibe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  ref={moodInputRef} // Add ref
                  name="mood"
                  placeholder="e.g., Chilling after work, hyped for a party, deep in thought..."
                  className="min-h-[120px] text-base bg-input border-border focus:ring-primary focus:border-primary"
                  required
                  aria-label="Describe your mood"
                />
                 {/* Language Input */}
                 <div>
                    <Label htmlFor="language" className="text-lg flex items-center gap-2 mb-2"><Languages size={20} className="text-primary" /> Preferred Language</Label>
                    <Input
                      id="language"
                      name="language"
                      placeholder="e.g., English, Español, हिन्दी"
                      className="text-base bg-input border-border focus:ring-primary focus:border-primary"
                      required
                      aria-label="Preferred language"
                    />
                 </div>
              </CardContent>
            </Card>

            {/* Genre Selection Card */}
            <GenreSelector
               selectedGenres={selectedGenres}
               onGenreChange={handleGenreChange}
            />
          </div>

          {/* Submit Button */}
           <div className="text-center mt-8">
             <Button type="submit" size="lg" disabled={isPending} className="w-full md:w-1/2 lg:w-1/3 group bg-gradient-to-r from-primary via-red-500 to-pink-600 hover:from-primary/90 hover:via-red-500/90 hover:to-pink-600/90 text-primary-foreground shadow-lg hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105 text-lg font-semibold" aria-live="polite">
               {isPending ? (
                  <LoadingAnimation text="Finding your vibe..." size="sm" className="py-1" />
               ) : (
                  <>
                   Find My Vibe <Send size={20} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
               )}
             </Button>
           </div>
        </form>

        {/* Results Section */}

        {formState.success && formState.data && (
           <div className="mt-12 w-full space-y-10 fade-in">
              {/* Display Analysis with Typing Effect */}
              {analysis && (
                  <Card className="w-full shadow-lg text-left bg-card/80 backdrop-blur-sm border-border/50">
                       <CardHeader>
                         <CardTitle className="text-xl">AI's Mood Interpretation</CardTitle>
                       </CardHeader>
                       <CardContent>
                         {/* Typing effect applied here */}
                         <p className="text-base text-secondary-foreground font-mono min-h-[4em]">
                            {typedMood}
                            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span> {/* Blinking cursor */}
                         </p>
                       </CardContent>
                  </Card>
              )}

             {/* Song Recommendations */}
             <section>
               <h2 className="text-3xl font-semibold mb-6 flex items-center justify-center gap-2 text-primary"><Music /> Song Recommendations</h2>
               {songs.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 justify-center">
                   {songs.map((song, index) => (
                     <LlmRecommendationCard key={`${song.name}-${index}-${song.artist}`} song={song} />
                   ))}
                 </div>
               ) : (
                   <Alert variant="default" className="mt-6 w-full fade-in bg-secondary text-secondary-foreground border-secondary">
                     <AlertCircle className="h-4 w-4 text-primary" />
                     <AlertTitle>No Songs Found</AlertTitle>
                     <AlertDescription>The AI couldn't find specific song matches. Try adjusting your mood or genre preferences.</AlertDescription>
                   </Alert>
               )}
             </section>

             {/* Related Playlists */}
              <section>
               <h2 className="text-3xl font-semibold mb-6 flex items-center justify-center gap-2 text-primary"><ListMusic /> Playlist Themes</h2>
                {playlists.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
                   {playlists.map((playlist, index) => (
                     <LlmPlaylistCard key={`${playlist.name}-${index}`} playlist={playlist} />
                   ))}
                 </div>
                 ) : (
                    <Alert variant="default" className="mt-6 w-full fade-in bg-secondary text-secondary-foreground border-secondary">
                     <AlertCircle className="h-4 w-4 text-primary" />
                     <AlertTitle>No Playlists Found</AlertTitle>
                     <AlertDescription>No suitable playlist themes were suggested for this combination.</AlertDescription>
                   </Alert>
                 )}
              </section>
           </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
