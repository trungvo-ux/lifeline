const explorationTiles = Array.from({ length: 8 }, (_, index) => index)

export function ExplorationGrid() {
  return (
    <section
      aria-label="Exploration projects"
      className="exploration-grid mx-auto grid w-full max-w-[656px] grid-cols-2 gap-4 px-4 pb-16 sm:gap-5 sm:px-6 lg:px-0"
    >
      {explorationTiles.map((index) => (
        <div
          key={index}
          className="exploration-grid-tile aspect-[4/3] bg-zinc-100 dark:bg-zinc-900"
          style={{ animationDelay: `${index * 55}ms` }}
          aria-hidden="true"
        />
      ))}
    </section>
  )
}
