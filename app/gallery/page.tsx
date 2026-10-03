"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function Gallery() {
  const [sims, setSims] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("sims")
      .select("id, title, query, spec, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setSims(data || []));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Gallery</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sims.map((s) => (
            <Link
              key={s.id}
              href={`/sim/${s.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-lg p-5 transition"
            >
              <p className="text-xs text-blue-400 uppercase">{s.spec.domain}</p>
              <h3 className="text-lg font-semibold mt-1">{s.title}</h3>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">{s.spec.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}