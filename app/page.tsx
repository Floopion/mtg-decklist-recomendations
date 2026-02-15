export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          MTG Decklist Recommendations
        </h1>
        <p className="text-lg text-muted-foreground">
          Paste your Commander decklist or an Archidekt URL and get AI-powered
          suggestions for cuts, additions, and mana base improvements.
        </p>
      </main>
    </div>
  );
}
