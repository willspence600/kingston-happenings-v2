import type { Metadata } from "next";
import "./globals.css";
import { Navigation, Footer } from "@/components";
import { AuthProvider } from "@/contexts/AuthContext";
import { EventsProvider } from "@/contexts/EventsContext";

export const metadata: Metadata = {
  title: "Kingston Happenings | Events in Kingston, Ontario",
  description: "Discover concerts, food specials, trivia nights, and all the best events happening in Kingston, Ontario. Your guide to the Limestone City.",
  keywords: ["Kingston", "Ontario", "events", "concerts", "food specials", "trivia", "festivals", "things to do"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <EventsProvider>
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </EventsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
