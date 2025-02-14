import { Landmark } from "lucide-react";
import { Header } from "@/components/header";
import { MintName, MintIcon } from "@/components/mint";
import { useParams } from "react-router-dom";

export default function Mint() {
  const { url } = useParams();
  const mint = `https://${url}`;
  return (
    <div>
      <Header>
        <div className="flex flex-row w-full items-center justify-between">
          <div className="flex flex-row items-center gap-1.5">
            <MintIcon url={mint} className="size-5 text-muted-foreground" />
            <h1>
              <MintName url={mint} />
            </h1>
          </div>
          <Landmark className="size-5 text-muted-foreground" />
        </div>
      </Header>
    </div>
  );
}
