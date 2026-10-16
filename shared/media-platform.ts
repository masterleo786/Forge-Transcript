export type MediaPlatform =
  | "facebook"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "rednote"
  | "kuaishou"
  | "unknown";

const PLATFORM_HOSTS: Array<{ platform: MediaPlatform; domains: string[] }> = [
  { platform: "facebook", domains: ["facebook.com", "fb.com", "fb.watch", "fb.me"] },
  { platform: "youtube", domains: ["youtube.com", "youtube-nocookie.com", "youtu.be"] },
  { platform: "instagram", domains: ["instagram.com", "instagr.am"] },
  { platform: "tiktok", domains: ["tiktok.com", "tiktokv.com", "musical.ly"] },
  { platform: "rednote", domains: ["rednote.com", "xiaohongshu.com", "xhslink.com"] },
  { platform: "kuaishou", domains: ["kuaishou.com", "kuaishou.cn", "kwai.com", "kwaii.com"] },
];

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function detectMediaPlatformFromUrl(rawUrl: string): MediaPlatform {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/\.$/, "");
    return PLATFORM_HOSTS.find(({ domains }) =>
      domains.some((domain) => matchesDomain(hostname, domain)),
    )?.platform ?? "unknown";
  } catch {
    return "unknown";
  }
}
