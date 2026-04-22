import { useEffect, useState } from "react";
import Hero from "../components/Hero";
import SectionCard from "../components/SectionCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Home() {
  const [apiMessage, setApiMessage] = useState("Loading...");

  useEffect(() => {
    async function loadMessage() {
      try {
        const response = await fetch(`${API_URL}/`);
        const data = await response.json();
        setApiMessage(data.message);
      } catch (error) {
        setApiMessage("Server not reachable");
      }
    }

    loadMessage();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-8">
      <Hero apiMessage={apiMessage} />

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <SectionCard
          title="components/"
          text="Keep reusable UI pieces here, such as buttons, cards, navbars, and forms."
        />
        <SectionCard
          title="pages/"
          text="Start each main screen here. As the app grows, each page can compose smaller components."
        />
        <SectionCard
          title=".env"
          text="Store frontend environment variables here. Vite variables must start with VITE_."
        />
      </section>
    </main>
  );
}

export default Home;
