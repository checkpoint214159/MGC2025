'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react'; 
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';

export default function ChatComponent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]); 

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Checking Authentication...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto h-screen stretch p-4">
      <h1 className="text-3xl font-extrabold my-6 text-center text-blue-600">
        Witty DeepSeek Assistant 🤖
      </h1>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20">
        {/* Display Streaming Messages */}
        {messages.map(m => (
          <div key={m.id} className={`p-4 rounded-xl shadow-md ${m.role === 'user' ? 'bg-blue-50 text-right ml-auto' : 'bg-gray-50 text-left mr-auto'}`}>
            <span className="font-bold block mb-1 text-sm text-gray-700">
              {m.role === 'user' ? 'You' : 'AI'}
            </span>
            <div className="whitespace-pre-wrap text-gray-900">{m.content}</div>
          </div>
        ))}
      </div>

      {/* Input Form at the bottom */}
      <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto p-4 bg-white border-t">
        <input
          className="w-full p-3 border border-gray-300 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={input}
          placeholder="Ask me anything code related..."
          onChange={handleInputChange}
        />
        <button 
          type="submit" 
          className="mt-3 w-full p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}