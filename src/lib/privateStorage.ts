// The owner is set only after Supabase verifies the user, never from cached claims.
let owner: string | null = null;
export function setStorageOwner(id: string | null) { owner = id; }
export const privateStorage = {
  getItem(key: string): string | null {
    return owner ? localStorage.getItem(`fenix-private:${owner}:${key}`) : null;
  },
  setItem(key: string, value: string) {
    if (!owner) throw new Error("Sessione richiesta per salvare dati.");
    localStorage.setItem(`fenix-private:${owner}:${key}`, value);
  },
};
export function clearPrivateStorage() {
  // Keep the user's saved work, but stop exposing it to the next session.
  owner = null;
}
