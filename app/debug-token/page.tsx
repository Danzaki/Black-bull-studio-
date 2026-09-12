"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function DebugTokenPage() {
  const [token, setToken] = useState<string>("Loading...");

  useEffect(() => {
    async function fetchToken() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token || "NO SESSION - please log in first.");
    }
    fetchToken();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>Debug: Access Token</h2>
      <p>Tap the box below, select all, and copy:</p>
      <textarea
        readOnly
        value={token}
        style={{ width: "100%", height: 150, fontSize: 12 }}
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
    </div>
  );
}
