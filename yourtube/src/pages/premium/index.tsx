import React, { useEffect } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Check, Star, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";

export default function Premium() {
  const { user, login, handlegooglesignin } = useUser();
  const router = useRouter();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePurchase = async (planType: string) => {
    if (!user) {
      toast.error("Please sign in first to subscribe!");
      handlegooglesignin();
      return;
    }

    const toastId = toast.loading(`Initiating your order for ${planType} plan...`);

    try {
      // 1. Create order on backend
      const res = await axiosInstance.post("/payment/order", {
        userId: user._id,
        planType: planType.toLowerCase(),
      });

      const { orderId, amount, currency, keyId } = res.data;

      // 2. Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "YourTube Premium",
        description: `${planType.toUpperCase()} Subscription Plan`,
        order_id: orderId,
        handler: async (response: any) => {
          const verifyingToastId = toast.loading("Verifying your payment...");
          try {
            // 3. Verify signature on backend
            const verifyRes = await axiosInstance.post("/payment/verify", {
              userId: user._id,
              orderId: orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planType: planType,
            });

            if (verifyRes.data.success) {
              toast.success("Payment verified! Subscription activated.", { id: verifyingToastId });
              login(verifyRes.data.user); // Update local user state context
              router.push("/");
            } else {
              toast.error("Payment verification failed.", { id: verifyingToastId });
            }
          } catch (error) {
            console.error("Verification error:", error);
            toast.error("Error verifying payment signature.", { id: verifyingToastId });
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#EF4444", // red-500
        },
        modal: {
          ondismiss: () => {
            toast.info("Transaction cancelled by user.");
          },
        },
      };

      toast.dismiss(toastId);
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error("Order process error:", error);
      toast.error(error.response?.data?.message || "Failed to initiate payment. Please try again.");
    }
  };

  const plans = [
    {
      name: "Bronze",
      price: "₹10",
      rawPrice: 10,
      limit: "7 Minutes",
      description: "Extend your video viewing session limit.",
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      features: [
        "7 minute viewing limit per video",
        "Standard quality streaming",
        "Ad-supported interface",
        "Invoice receipt via Email",
      ],
      color: "border-orange-200 hover:border-orange-400 bg-orange-50/50",
      buttonColor: "bg-orange-600 hover:bg-orange-700",
    },
    {
      name: "Silver",
      price: "₹50",
      rawPrice: 50,
      limit: "10 Minutes",
      description: "Ideal for mid-length educational and recipe videos.",
      icon: <Shield className="w-6 h-6 text-slate-500" />,
      features: [
        "10 minute viewing limit per video",
        "HD quality streaming (720p)",
        "Ad-supported interface",
        "Invoice receipt via Email",
      ],
      color: "border-slate-300 hover:border-slate-400 bg-slate-50/50 shadow-md",
      buttonColor: "bg-slate-700 hover:bg-slate-800",
    },
    {
      name: "Gold",
      price: "₹100",
      rawPrice: 100,
      limit: "Unlimited",
      description: "The ultimate viewing experience with zero constraints.",
      icon: <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />,
      features: [
        "No viewing limits (Unlimited play)",
        "Full HD quality streaming (1080p)",
        "Ad-free viewing experience",
        "Invoice receipt via Email",
        "Prioritized customer support",
      ],
      color: "border-yellow-300 hover:border-yellow-400 bg-yellow-50/50 relative shadow-lg scale-105 md:scale-110 z-10",
      buttonColor: "bg-yellow-600 hover:bg-yellow-700 text-black font-bold",
      popular: true,
    },
  ];

  return (
    <main className="flex-1 p-6 md:p-12 bg-white text-black min-h-screen">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Title Block */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Upgrade YourTube Experience</h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base">
            Choose a plan that fits your viewing needs. Upgrade instantly via safe Razorpay payment gateway options.
          </p>
          {user && (
            <div className="inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
              Current Plan: <span className="text-red-600 capitalize">{user.planType || "free"}</span>
            </div>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 items-center">
          {plans.map((plan) => {
            const isCurrent = user?.planType === plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-6 flex flex-col justify-between h-[450px] transition-all duration-300 ${plan.color}`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-xl tracking-wide">{plan.name}</span>
                    {plan.icon}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-gray-500 text-sm">/ life-time</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    Limit: <span className="font-bold text-black">{plan.limit}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-6 leading-snug">{plan.description}</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex gap-2 items-start text-xs text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button disabled className="w-full bg-gray-200 text-gray-500 font-semibold cursor-not-allowed">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(plan.name)}
                      className={`w-full text-white font-semibold transition-transform duration-200 active:scale-95 ${plan.buttonColor}`}
                    >
                      {user ? `Upgrade to ${plan.name}` : `Sign In to Buy`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Block */}
        <div className="border-t pt-10 text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-lg md:text-xl font-bold">Frequently Asked Questions</h2>
          <div className="text-left grid gap-4 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-black">How do the video viewing limits work?</p>
              <p>Viewing limits are enforced per individual video playback session. Standard plans allow viewing up to the limit (e.g. 5 minutes for Free), after which playback pauses and requires upgrading.</p>
            </div>
            <div>
              <p className="font-semibold text-black">Do subscriptions expire?</p>
              <p>No, subscription plans purchased on YourTube are lifetime memberships that do not expire.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
