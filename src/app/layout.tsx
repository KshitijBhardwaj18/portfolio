import type { Metadata } from "next";
import { Google_Sans_Flex, Instrument_Serif } from "next/font/google";
import { Footer } from "@/components/footer";
import "./globals.css";

const googleSans = Google_Sans_Flex({
  variable: "--font-google-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Kshitij Bhardwaj",
  description: "Software Engineer",
};

// Runs before paint so the saved theme never flashes. Dark is the default.
const themeScript = `try{if(localStorage.theme==="light")document.documentElement.classList.remove("dark")}catch{}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${instrumentSerif.variable} dark antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <Footer />
      </body>
    </html>
  );
}
