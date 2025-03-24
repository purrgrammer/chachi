export interface CreateRelayOptions {
  name: string;
  pubkey: string;
}

export interface Order {
  id: string;
}

export interface RelayInfo {
  id: string;
  name: string;
  domain: string;
}

export interface OrderInfo extends Order {
  amount: number;
  paid: boolean;
  lnurl: string;
  relay: RelayInfo;
}

export abstract class RelayService {
  abstract domain: string;
  abstract createRelay(options: CreateRelayOptions): Promise<Order>;
  abstract getOrder(id: string): Promise<OrderInfo>;
  abstract topUp(relay: string, mount: number): Promise<Order>;
}
