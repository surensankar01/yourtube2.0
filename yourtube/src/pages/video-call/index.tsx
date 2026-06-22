import React, { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Video, Link2, Users, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) id += "-";
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function VideoCallHome() {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!user) {
      toast.error("Please sign in to create a room");
      handlegooglesignin();
      return;
    }
    const id = generateRoomId();
    setNewRoomId(id);
  };

  const handleJoin = () => {
    if (!user) {
      toast.error("Please sign in to join a call");
      handlegooglesignin();
      return;
    }
    const id = joinRoomId.trim();
    if (!id) {
      toast.error("Please enter a valid room ID");
      return;
    }
    router.push(`/video-call/${id}`);
  };

  const handleStartCall = () => {
    if (newRoomId) {
      router.push(`/video-call/${newRoomId}`);
    }
  };

  const handleCopy = async () => {
    const link = `${window.location.origin}/video-call/${newRoomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-blue-600/20 rounded-full border border-blue-500/30">
              <Video className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">Video Call</h1>
          <p className="text-gray-400 text-lg">
            HD video calls with screen sharing, recording, and up to 4 participants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Room */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-lg">Create New Room</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Start an instant video call and invite others with a link.
            </p>

            {newRoomId ? (
              <div className="space-y-3">
                <div className="bg-black/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-gray-400">Your Room ID:</p>
                  <p className="text-blue-400 font-mono font-bold text-lg tracking-wider">
                    {newRoomId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2 text-green-400" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                    )}
                  </Button>
                  <Button
                    onClick={handleStartCall}
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Start Call <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCreate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Video className="w-4 h-4 mr-2" />
                {user ? "Generate Room" : "Sign In to Create"}
              </Button>
            )}
          </div>

          {/* Join Room */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Link2 className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold text-lg">Join Existing Room</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Have an invite link or Room ID? Enter it below to join.
            </p>
            <Input
              placeholder="Enter Room ID (e.g. abc1-def2-ghi3)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="bg-black/30 border-white/20 text-white placeholder:text-gray-500"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button
              onClick={handleJoin}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!joinRoomId.trim()}
            >
              Join Call <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "🎥", label: "HD Video" },
            { icon: "🖥️", label: "Screen Share" },
            { icon: "⏺️", label: "Recording" },
            { icon: "🔇", label: "Mute / Cam Toggle" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs text-gray-400">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
