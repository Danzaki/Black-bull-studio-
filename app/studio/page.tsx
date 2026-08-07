import PromptEditor from "@/components/studio/PromptEditor";
import StyleSelector from "@/components/studio/StyleSelector";

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-yellow-400">
            AI Meme Studio
          </h1>

          <p className="mt-3 text-zinc-400">
            Create premium AI-powered memes, campaigns, and visual concepts.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <PromptEditor />
          <StyleSelector />
        </div>

        <div className="mt-10 rounded-2xl border border-yellow-500/30 bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold text-yellow-400">
            🖼️ AI Preview
          </h2>

          <div className="mt-6 flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700">
            <p className="text-zinc-500">
              Your AI generated image will appear here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}