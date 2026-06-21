import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { toast } from "sonner";
import { Smartphone, Mail, ShieldAlert, ArrowLeft, Loader2, MapPin } from "lucide-react";

interface OTPLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OTPLoginModal({ isOpen, onClose }: OTPLoginModalProps) {
  const { login, userRegion } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [etherealUrl, setEtherealUrl] = useState<string | null>(null);
  const [mockOtp, setMockOtp] = useState<string | null>(null);

  const southIndianStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
  const detectedRegion = userRegion?.region || "";
  const isSouthIndia = southIndianStates.some((state) =>
    detectedRegion.toLowerCase().includes(state.toLowerCase())
  );

  // Determine login method automatically based on the user's location
  useEffect(() => {
    if (userRegion) {
      if (isSouthIndia) {
        setMethod("email");
      } else {
        setMethod("sms");
      }
    }
  }, [userRegion, isSouthIndia]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter a valid identifier.");
      return;
    }

    // Basic validation
    if (method === "email") {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      if (!isEmail) {
        toast.error("Please enter a valid email address.");
        return;
      }
    } else {
      const isPhone = /^\+?[0-9]{10,15}$/.test(identifier);
      if (!isPhone) {
        toast.error("Please enter a valid mobile number (10-15 digits).");
        return;
      }
    }

    setLoading(true);
    setEtherealUrl(null);
    setMockOtp(null);

    try {
      const response = await axiosInstance.post("/user/send-otp", {
        identifier: identifier.trim(),
      });

      if (response.data.success) {
        setIsOtpSent(true);
        toast.success(response.data.message || "OTP sent successfully!");
        
        // Ethereal preview URL is only returned for email OTPs
        if (response.data.etherealUrl) {
          setEtherealUrl(response.data.etherealUrl);
        }
        // Note: SMS OTP is no longer returned in the response (CE-03 security fix).
        // In development, check the server terminal for the mocked SMS OTP.
      }
    } catch (error: any) {
      console.error("Failed to send OTP:", error);
      toast.error(error.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        identifier: identifier.trim(),
        otp: otp.trim(),
      });

      if (response.data?.result) {
        login(response.data.result);
        toast.success("Signed in successfully!");
        handleClose();
      }
    } catch (error: any) {
      console.error("Failed to verify OTP:", error);
      toast.error(error.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier("");
    setOtp("");
    setIsOtpSent(false);
    setEtherealUrl(null);
    setMockOtp(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden bg-background text-foreground border border-border rounded-xl shadow-2xl p-6 transition-all duration-300">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary dark:text-white">
            {method === "email" ? (
              <Mail className="h-6 w-6 text-red-600 dark:text-red-500 animate-pulse" />
            ) : (
              <Smartphone className="h-6 w-6 text-red-600 dark:text-red-500 animate-pulse" />
            )}
            OTP Verification
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            Secure login for YourTube. Auto-configured based on your regional location.
          </DialogDescription>
        </DialogHeader>

        {/* Region detection status card */}
        <div className="flex items-center gap-3 bg-muted/50 dark:bg-muted/10 border border-border/50 rounded-lg p-3 mb-4 text-xs">
          <MapPin className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block">Detected Location:</span>
            <span className="text-muted-foreground">
              {userRegion?.region ? `${userRegion.region}, ${userRegion.country_name || "India"}` : "Detecting location..."}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
            isSouthIndia 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}>
            {method.toUpperCase()} OTP
          </span>
        </div>

        {!isOtpSent ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">
                {method === "email" ? "Email Address" : "Mobile Phone Number"}
              </Label>
              <div className="relative">
                <Input
                  id="identifier"
                  type={method === "email" ? "email" : "tel"}
                  placeholder={
                    method === "email" 
                      ? "Enter your email (e.g. name@domain.com)" 
                      : "Enter 10-digit number (e.g. 9876543210)"
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full pr-10 focus-visible:ring-red-500"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {method === "email" ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                {method === "email" 
                  ? "As a South Indian user, you login with Email OTP verification."
                  : "As a user from other states, you login with Mobile SMS OTP."}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                "Send One-Time Password"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="otp" className="text-sm font-medium">
                  Enter 6-Digit OTP
                </Label>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="text-xs text-red-600 hover:text-red-500 flex items-center gap-1 font-medium"
                  disabled={loading}
                >
                  <ArrowLeft className="h-3 w-3" /> Change {method === "email" ? "email" : "phone"}
                </button>
              </div>
              
              <Input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className="w-full text-center text-2xl font-bold tracking-widest py-3 focus-visible:ring-red-500"
                required
              />

              <p className="text-xs text-muted-foreground mt-1">
                An OTP was sent to <strong className="text-foreground">{identifier}</strong>.
              </p>
            </div>

            {/* Test helper outputs for easier evaluation */}
            {(etherealUrl || mockOtp) && (
              <div className="bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Developer Test Mode Enabled</span>
                </div>
                {etherealUrl && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-[11px]">Click below to open the test mailbox and read the OTP code:</p>
                    <a
                      href={etherealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 dark:text-red-400 underline font-medium block truncate hover:text-red-500"
                    >
                      Open Ethereal Mailbox ↗
                    </a>
                  </div>
                )}
                {mockOtp && (
                  <p className="text-muted-foreground text-[11px]">
                    SMS Mobile OTP (Mocked): <strong className="text-red-600 dark:text-red-400 text-sm tracking-wider font-mono">{mockOtp}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Log In"
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOTP}
                className="w-full border-border hover:bg-muted"
                disabled={loading}
              >
                Resend OTP Code
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
