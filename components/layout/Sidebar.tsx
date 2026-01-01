"use client";
import React, { useState } from 'react';
import SidebarSection from '@/components/layout/SidebarSection'; 
import { HomeIcon, GearIcon, DesktopIcon, PersonIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  // Tailwind classes for width transition
  const widthClass = isExpanded ? "w-60" : "w-16"; 
  
  // Custom transition settings for Tailwind
  const transitionClass = "transition-all duration-300 ease-in-out";

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen bg-gray-900 text-white shadow-xl 
        p-4 z-50 overflow-x-hidden
        ${widthClass} ${transitionClass}
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={`flex flex-col h-full ${isExpanded ? "items-start" : "items-center"}`}>
        
        <div className={`mb-8 p-1 ${isExpanded ? 'text-lg font-bold' : 'text-xl'}`}>
          {isExpanded ? 'LLM App' : 'App'}
        </div>

        <button
          onClick={() => handleNavigation('/')}
          className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <HomeIcon className="w-6 h-6 shrink-0" />
          {isExpanded && <span className="ml-3 whitespace-nowrap">Home</span>}
        </button>

        <button
          onClick={() => handleNavigation('/profile')}
          className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <PersonIcon className="w-6 h-6 shrink-0" />
          {isExpanded && <span className="ml-3 whitespace-nowrap">Profile</span>}
        </button>

        {/* <SidebarSection 
            isExpanded={isExpanded} 
            title="Profile" 
            defaultOpen={true} // Default section opened
            icon={PersonIcon}
            links={[
                { name: 'Model V1', path: '/projects/v1' },
                { name: 'Training Data', path: '/projects/data' },
            ]}
            onNavigate={handleNavigation}
        />

        <SidebarSection 
            isExpanded={isExpanded} 
            title="Reports" 
            icon={FileTextIcon}
            links={[
                { name: 'Analytics', path: '/reports/analytics' },
                { name: 'Logs', path: '/reports/logs' },
            ]}
            onNavigate={handleNavigation}
        /> */}
        
        {/* Footer/Settings Link (Always visible) */}
        <button
          onClick={() => handleNavigation('/settings')}
          className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700 mt-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <GearIcon className="w-6 h-6 shrink-0" />
          {isExpanded && <span className="ml-3 whitespace-nowrap">Settings</span>}
        </button>
        
      </div>
    </aside>
  );
}