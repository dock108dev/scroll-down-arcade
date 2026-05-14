import { DailyRun } from "@/components/DailyRun";

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{
        backgroundColor: "var(--arcade-bg)",
        color: "var(--arcade-text)",
      }}
    >
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1
          className="text-xs font-mono uppercase tracking-[0.3em] text-center"
          style={{ color: "var(--arcade-muted)" }}
        >
          Scroll Down Arcade
        </h1>
        <DailyRun />
      </div>
    </main>
  );
}
