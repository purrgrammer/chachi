import { Header } from "@/components/header";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <>
      <Header>
        <h2 className="text-lg">Home</h2>
      </Header>
      <div className="flex flex-col p-2">
        <Dashboard />
      </div>
    </>
  );
}
