import { RelayService } from "./service";

class NostrOneService implements RelayService {
  domain: string;

  constructor() {
    this.domain = "relay.tools";
  }

  async createRelay(options: { name: string; pubkey: string }) {
    const query = new URLSearchParams();
    query.append("relayname", options.name);
    query.append("pubkey", options.pubkey);
    query.append("referrer", "chachi");
    const response = await fetch(
      `https://${this.domain}/api/invoices?${query.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data;
  }

  async getOrder(id: string) {
    const response = await fetch(`https://${this.domain}/api/invoices/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  }

  async topUp(relay: string, amount: number) {
    const query = new URLSearchParams();
    query.append("relayname", relay);
    query.append("topup", "true");
    query.append("amount", amount.toString());
    query.append("referrer", "chachi");
    const response = await fetch(
      `https://${this.domain}/api/invoices?${query.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();
    return data;
  }
}

const nostrOne = new NostrOneService();

export default nostrOne;
