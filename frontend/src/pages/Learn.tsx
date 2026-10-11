// Learn page — a side-by-side comparison: LEFT half "Rivers Around the World",
// RIGHT half "Rivers of India". Within each half: heading + explanation + two
// vertically stacked videos (local files, poster fallback until provided).

function LearnVideo({ src, poster }: { src: string; poster: string }) {
  return (
    <div className="learn-video">
      <video poster={poster} autoPlay muted loop playsInline preload="metadata">
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

export function Learn() {
  const worldPoster = "/videos/learn/world/poster-world.svg";
  const indiaPoster = "/videos/learn/india/poster-india.svg";

  return (
    <article className="learn">
      {/* Intro */}
      <header className="learn-intro">
        <div className="container">
          <span className="learn-eyebrow">A moment of reflection</span>
          <h1>How we treat our rivers says a lot about us</h1>
        </div>
      </header>

      {/* Side-by-side split: world (left) | india (right) */}
      <div className="learn-split">
        {/* LEFT — Rivers Around the World */}
        <section className="learn-col learn-col-world">
          <h2>Rivers Around the World</h2>
          <div className="learn-text">
            <p>
              In many places, clean water isn't an accident — it's a habit. The river is
              treated as a shared resource everyone is responsible for.
            </p>
            <p>
              Notice how it's cared for by many, not one. Watch how the water is treated.
            </p>
          </div>
          <div className="learn-videos">
            <LearnVideo src="/videos/learn/world/world-1.mp4" poster={worldPoster} />
            <LearnVideo src="/videos/learn/world/world-2.mp4" poster={worldPoster} />
          </div>
        </section>

        {/* RIGHT — Rivers of India */}
        <section className="learn-col learn-col-india">
          <h2>Rivers of India</h2>
          <div className="learn-text">
            <p>
              Here, rivers are sacred — the Ganga revered as a mother. Yet some of those same
              rivers carry waste and neglect.
            </p>
            <p className="learn-question">
              If we call our rivers sacred, shouldn't that show in how we treat them?
            </p>
          </div>
          <div className="learn-videos">
            <LearnVideo src="/videos/learn/india/india-1.mp4" poster={indiaPoster} />
            <LearnVideo src="/videos/learn/india/india-2.mp4" poster={indiaPoster} />
          </div>
        </section>
      </div>

      {/* Closing: personal responsibility */}
      <footer className="learn-close">
        <div className="container">
          <p>What we believe about water, and what we do to it, don't have to be two different stories.</p>
          <span className="learn-close-small">The next small choice is yours.</span>
        </div>
      </footer>
    </article>
  );
}
