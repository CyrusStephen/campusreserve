function App() {
  return (
    <main className="min-h-screen bg-[#f7f6f3] px-6 py-16 text-[#191919]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 inline-flex rounded-full border-2 border-black bg-yellow-300 px-4 py-2 font-semibold">
          CampusReserve
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
          Reserve what your campus needs.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-neutral-700">
          Rooms, halls, laboratories and equipment—all managed through one
          friendly college workspace.
        </p>

        <button
          type="button"
          className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Explore resources
        </button>
      </section>
    </main>
  )
}

export default App