// Change this to your machine's local IP when testing on a physical device.
// e.g. "http://192.168.1.42:8000"  — find it with `ifconfig | grep 'inet '`
export const API_BASE = "http://192.168.1.5:8000";

export type Roommate = {
  id: number;
  name: string;
  created_at: string;
};

export type RoommateSummary = {
  id: number;
  name: string;
  total: number;
  session_count: number;
};

export type ParsedItem = {
  name: string;
  price: number;
};

export type SessionItem = {
  id: number;
  name: string;
  price: number;
};

export type Session = {
  id: number;
  roommate_id: number;
  roommate_name: string;
  label: string | null;
  total: number;
  created_at: string;
  items?: SessionItem[];
};

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Roommates
  getRoommates: () => req<Roommate[]>("/roommates"),
  createRoommate: (name: string) =>
    req<Roommate>("/roommates", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteRoommate: (id: number) =>
    fetch(`${API_BASE}/roommates/${id}`, { method: "DELETE" }),

  // Receipt parsing
  parseReceipt: async (uri: string, mimeType = "image/jpeg"): Promise<ParsedItem[]> => {
    const formData = new FormData();
    formData.append("file", { uri, name: "receipt.jpg", type: mimeType } as unknown as Blob);
    const res = await fetch(`${API_BASE}/receipts/parse`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    const data = await res.json() as { items: ParsedItem[] };
    return data.items;
  },

  // Sessions
  getSessions: (roommateId?: number) =>
    req<Session[]>("/sessions" + (roommateId ? `?roommate_id=${roommateId}` : "")),
  getSession: (id: number) => req<Session>(`/sessions/${id}`),
  createSession: (body: {
    roommate_id: number;
    label?: string;
    items: ParsedItem[];
  }) =>
    req<{ id: number; total: number }>("/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteSession: (id: number) =>
    fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" }),

  // Summary
  getSummary: () => req<RoommateSummary[]>("/summary"),
};
