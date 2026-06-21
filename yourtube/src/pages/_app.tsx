import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "next-themes";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <UserProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
          <div className="flex">
            <Sidebar />
            <main className="flex-grow">
              <Component {...pageProps} />
            </main>
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}

