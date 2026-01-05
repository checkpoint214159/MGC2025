'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type DateContextType = {
  displayDate: Date;      // The date for the UI
  normalizedDate: Date;   // The date at 00:00:00 for DB queries
  isSimulated: boolean;   // Flag to show "DEV MODE" warnings
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ 
  children, 
  initialDate 
}: { 
  children: React.ReactNode, 
  initialDate: string // Pass as ISO string from server
}) {
  // We use the initial date passed from the Server (Root Layout)
  const [date, setDate] = useState(new Date(initialDate));

  useEffect(() => {
    setDate(new Date(initialDate));
  }, [initialDate]);

  const value = {
    displayDate: date,
    normalizedDate: new Date(new Date(date).setHours(0, 0, 0, 0)),
    isSimulated: new Date(date).toDateString() !== new Date().toDateString()  // is it today?
  };

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
}

export const useAppDate = () => {
  const context = useContext(DateContext);
  if (!context) throw new Error("useAppDate must be used within DateProvider");
  return context;
};
