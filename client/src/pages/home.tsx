import { CharacterFeed } from "@/components/character-feed";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function Home() {
  return (
    <div className="relative w-full h-screen bg-dark-bg text-dark-text overflow-hidden">
      <CharacterFeed />
      <BottomNavigation />
    </div>
  );
}
