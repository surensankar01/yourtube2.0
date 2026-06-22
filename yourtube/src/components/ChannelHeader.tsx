import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const displayName = channel?.channelname || channel?.name || "Unknown Channel";
  const planType = channel?.planType || "free";

  const getPlanBadge = () => {
    if (!planType || planType === "free") return null;
    let colorClass = "bg-red-100 text-red-800 border-red-200";
    if (planType === "bronze") colorClass = "bg-orange-100 text-orange-800 border-orange-200";
    if (planType === "silver") colorClass = "bg-slate-100 text-slate-800 border-slate-200";
    if (planType === "gold") colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200 font-bold";
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold border ${colorClass} capitalize`}>
        {planType} Member
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl font-bold bg-gray-200">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-3">
              {displayName}
              {getPlanBadge()}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>@{displayName.toLowerCase().replace(/\s+/g, "")}</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-gray-700 max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          {user && user?._id !== channel?._id && (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsSubscribed(!isSubscribed)}
                variant={isSubscribed ? "outline" : "default"}
                className={
                  isSubscribed ? "bg-gray-100" : "bg-red-600 hover:bg-red-700"
                }
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
