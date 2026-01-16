'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type DateContextType = {
  displayDate: Date;  
  normalizedDate: Date;  
  isSimulated: boolean;   
  isToday: boolean;
}

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

  const value = useMemo(() => {
    const normalized = new Date(new Date(date).setHours(0, 0, 0, 0));
    const realToday = new Date(new Date().setHours(0, 0, 0, 0));
    
    console.log('raw date in dateProvider?', date)
    return {
      displayDate: date,
      normalizedDate: normalized,
      isSimulated: normalized.getTime() !== realToday.getTime(),
      isToday: normalized.getTime() === realToday.getTime() // New helper
    };
  }, [date]);

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
