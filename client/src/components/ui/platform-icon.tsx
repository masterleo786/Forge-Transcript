import { Facebook, Youtube, Instagram, Music, FileAudio, Link as LinkIcon } from "lucide-react";

export function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: string | null | undefined, className?: string }) {
  const p = platform?.toLowerCase() || "";
  
  if (p.includes("facebook") || p.includes("fb")) {
    return <Facebook className={`${className} text-[#1877F2]`} />;
  }
  if (p.includes("youtube") || p.includes("youtu.be")) {
    return <Youtube className={`${className} text-[#FF0000]`} />;
  }
  if (p.includes("instagram") || p.includes("ig")) {
    return <Instagram className={`${className} text-[#E4405F]`} />;
  }
  if (p.includes("tiktok")) {
    return <Music className={`${className} text-white`} />;
  }
  if (p.includes("upload") || p.includes("file")) {
    return <FileAudio className={`${className} text-primary`} />;
  }
  
  return <LinkIcon className={`${className} text-muted-foreground`} />;
}
