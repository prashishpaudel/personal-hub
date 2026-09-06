import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Hub",
  description: "One space for notes, garden, feeds, and media.",
  // iOS only opens an installed app chrome-free when it sees this; it also
  // supplies the name shown under the home-screen icon.
  appleWebApp: {
    capable: true,
    title: "Hub",
    statusBarStyle: "default",
  },
};

// A single value, deliberately not a prefers-color-scheme pair: the palette is
// chosen in localStorage, not by the system, so a media query would disagree
// with what is actually on screen. Android derives the status-bar icon colour
// from this, and a mismatch renders white icons on the cream bar. The script
// below rewrites it to match the real theme before first paint.
export const viewport: Viewport = {
  themeColor: "#f7f4ef",
};

// Set theme before paint to avoid a flash of the wrong palette, and keep the
// status bar in step with it.
const themeScript = `
(function(){try{var t=localStorage.getItem('personal-hub:theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',t==='dark'?'#1a1814':'#f7f4ef');}catch(e){document.documentElement.dataset.theme='light';}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
