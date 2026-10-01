"use client";

import { createContext, useContext, useState } from "react";
import { currentUser } from "./mock-data";

const WalletContext = createContext<{
  balance: number;
  spend: (amount: number) => void;
  credit: (amount: number) => void;
}>({
  balance: currentUser.walletBalance,
  spend: () => {},
  credit: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(currentUser.walletBalance);

  const spend = (amount: number) => setBalance((prev) => Math.max(0, prev - amount));
  const credit = (amount: number) => setBalance((prev) => prev + amount);

  return (
    <WalletContext.Provider value={{ balance, spend, credit }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
