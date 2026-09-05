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

// The manifest carries a single theme_color, which left dark-mode users with a
// cream status bar. The meta tag takes a media query, so the installed app's
// chrome can follow the palette.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1814" },
  ],
};

// Set theme before paint to avoid a flash of the wrong palette.
const themeScript = `
(function(){try{var t=localStorage.getItem('personal-hub:theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();
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
