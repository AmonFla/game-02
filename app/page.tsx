import SumFallGame from "./components/SumFallGame";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-zinc-50 dark:bg-zinc-950">
      <SumFallGame />
    </div>
  );
}
