## Packages
react-dropzone | Drag and drop file upload handling
framer-motion | Smooth animations and page transitions
date-fns | Date and time formatting
file-saver | Easy file downloading (TXT, SRT)

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["var(--font-sans)"],
  display: ["var(--font-display)"],
}
Tailwind Config - extend colors:
Add primary gradient colors and deep dark mode background colors.
API endpoints expect FormData for file uploads with a 'file' key.
API URL parsing expects JSON { url: string }.
