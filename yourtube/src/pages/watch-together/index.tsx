import React, { useState } from "react";
import { generateRoomId, copyInviteLink } from "../../lib/roomUtils";
import { useRouter } from "next/router";

export default function WatchTogetherHome() {
  const [roomId, setRoomId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    const id = generateRoomId();
    // Simple optimistic navigation – backend will create room when client joins
    setRoomId(id);
    router.push(`/watch-together/${id}`);
  };

  const copyLink = async () => {
    if (roomId) {
      const success = await copyInviteLink(roomId);
      setCopied(success);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Watch Together</h1>
      <button
        onClick={createRoom}
        className="px-6 py-3 bg-green-600 rounded hover:bg-green-500 transition"
      >
        Create New Room
      </button>

      {roomId && (
        <div className="mt-6 text-center">
          <p className="mb-2">Share this link with friends:</p>
          <div className="flex items-center space-x-2 justify-center">
            <input
              type="text"
              readOnly
              value={(typeof window !== "undefined" ? window.location.origin : "") + "/watch-together/" + roomId}
              className="px-2 py-1 bg-gray-800 rounded text-sm w-80"
            />
            <button
              onClick={copyLink}
              className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
