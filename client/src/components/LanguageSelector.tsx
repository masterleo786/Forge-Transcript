import { Globe } from "lucide-react";

export const WHISPER_LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese (Mandarin)" },
  { code: "zh-yue", label: "Chinese (Cantonese)" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "id", label: "Indonesian" },
  { code: "ms", label: "Malay" },
  { code: "th", label: "Thai" },
  { code: "vi", label: "Vietnamese" },
  { code: "tr", label: "Turkish" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
  { code: "cs", label: "Czech" },
  { code: "sk", label: "Slovak" },
  { code: "hu", label: "Hungarian" },
  { code: "ro", label: "Romanian" },
  { code: "bg", label: "Bulgarian" },
  { code: "hr", label: "Croatian" },
  { code: "sr", label: "Serbian" },
  { code: "uk", label: "Ukrainian" },
  { code: "el", label: "Greek" },
  { code: "he", label: "Hebrew" },
  { code: "fa", label: "Persian / Farsi" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "ne", label: "Nepali" },
  { code: "si", label: "Sinhala" },
  { code: "sw", label: "Swahili" },
  { code: "af", label: "Afrikaans" },
  { code: "am", label: "Amharic" },
  { code: "az", label: "Azerbaijani" },
  { code: "be", label: "Belarusian" },
  { code: "bs", label: "Bosnian" },
  { code: "ca", label: "Catalan" },
  { code: "et", label: "Estonian" },
  { code: "gl", label: "Galician" },
  { code: "hy", label: "Armenian" },
  { code: "is", label: "Icelandic" },
  { code: "ka", label: "Georgian" },
  { code: "kk", label: "Kazakh" },
  { code: "lt", label: "Lithuanian" },
  { code: "lv", label: "Latvian" },
  { code: "mk", label: "Macedonian" },
  { code: "mi", label: "Maori" },
  { code: "mn", label: "Mongolian" },
  { code: "mt", label: "Maltese" },
  { code: "sq", label: "Albanian" },
  { code: "sl", label: "Slovenian" },
  { code: "tl", label: "Filipino / Tagalog" },
  { code: "cy", label: "Welsh" },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
  className?: string;
}

export function LanguageSelector({ value, onChange, className = "" }: LanguageSelectorProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Globe className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="select-language"
        className="w-full pl-9 pr-4 py-2.5 bg-card/60 border border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none cursor-pointer transition-colors hover:border-white/20"
      >
        {WHISPER_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-card text-foreground">
            {lang.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
