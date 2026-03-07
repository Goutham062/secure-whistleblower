import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes"; // <-- Import ThemeProvider
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Secure Whistleblower",
  description: "Anonymous reporting platform",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning is required on html tag for next-themes
    <html lang="en" suppressHydrationWarning> 
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}>
        {/* Wrap children in ThemeProvider */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}