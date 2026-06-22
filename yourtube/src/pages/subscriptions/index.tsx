import React from "react";
import Link from "next/link";

export default function Subscriptions() {
  return (
    <main className="flex-1 p-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white min-h-screen">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Your Subscriptions</h1>
        <p className="text-center mb-8">
          You currently have no active subscriptions. Choose a plan from the{' '}
          <Link href="/premium">
            <a className="underline hover:text-yellow-300">Premium page</a>
          </Link>{" "}to unlock extra features.
        </p>
        {/* Future subscription list can be rendered here */}
        <div className="text-center">
          <Link href="/premium">
            <a className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 transition">
              View Plans
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
