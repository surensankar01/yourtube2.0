import React from "react";
import { Lock } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

interface UpgradeBannerProps {
  planType: string;
}

export default function UpgradeBanner({ planType }: UpgradeBannerProps) {
  const limits: Record<string, string> = {
    free: "5 minutes",
    bronze: "7 minutes",
    silver: "10 minutes",
  };

  const limitText = limits[planType.toLowerCase()] || "your plan's limit";

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col justify-center items-center text-white text-center p-6 z-50 rounded-lg backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-red-600/20 p-4 rounded-full mb-4 ring-8 ring-red-600/10">
        <Lock className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Viewing Limit Reached!</h2>
      <p className="text-gray-300 max-w-md text-sm md:text-base mb-6 leading-relaxed">
        You have reached the <span className="font-semibold text-white">{limitText}</span> limit allowed under your <span className="font-semibold text-red-400 capitalize">{planType}</span> Plan. Upgrade to a higher plan to continue watching!
      </p>
      <div className="flex gap-4">
        <Link href="/premium">
          <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 shadow-lg transition-transform hover:scale-105">
            Upgrade Plan
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="border-gray-600 hover:bg-gray-800 text-gray-300">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
