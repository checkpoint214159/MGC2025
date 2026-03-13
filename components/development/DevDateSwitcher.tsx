'use client';
import { useAppDate } from '@/context/DateContext';
import { useRouter } from 'next/navigation';

/**
 * Development tool for simulating different dates.
 * Only visible in non-production environments.
 */
export function DevDateSwitcher() {
  const { isSimulated, displayDate } = useAppDate();
  const router = useRouter();

  if (process.env.NODE_ENV === 'production') return null;
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value).toISOString();
    document.cookie = `dev-simulated-date=${newDate}; path=/; max-age=86400`;
    router.refresh();
  };

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg border shadow-2xl z-50 
      ${isSimulated ? 'bg-orange-950 border-orange-500' : 'bg-zinc-900 border-zinc-700'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2">
        {isSimulated ? '⚠️ Time Travel Active' : 'System Clock'}
      </p>
      <input 
        type="date" 
        value={displayDate.toISOString().split('T')[0]}
        onChange={handleDateChange}
        className="bg-black text-white p-2 rounded text-sm w-full cursor-pointer"
      />
      {isSimulated && (
        <button 
          onClick={() => {
            document.cookie = "dev-simulated-date=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            router.refresh();
          }}
          className="mt-2 text-[10px] underline opacity-70 hover:opacity-100"
        >
          Reset to Actual Today
        </button>
      )}
    </div>
  );
}
