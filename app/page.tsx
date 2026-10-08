import Playground from './playground';

export default function Page() {
  return (
    <main>
      <h1>AstroNest quickstart</h1>
      <p className="lede">
        A Vedic chart, the running daśā periods and a domain reading, from the AstroNest Developer API. Every
        call below runs on your server with your key; the browser never sees it.
      </p>
      <Playground />
    </main>
  );
}
