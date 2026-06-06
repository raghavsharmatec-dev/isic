/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import SidebarTree from './components/SidebarTree';
import SchemaView from './components/SchemaView';
import { parseISICCSV } from './utils/csvParser';
import rawCSV from './data/industry_entities.csv?raw';
import { Menu, X } from 'lucide-react';

export default function App() {
  // Parse the bundled CSV data on load
  const { hierarchy, flatRows } = useMemo(() => {
    return parseISICCSV(rawCSV || '');
  }, []);

  const [selectedEntity, setSelectedEntity] = useState<{
    entity: string;
    classLabel: string;
    classCode: string;
    groupLabel: string;
    groupCode: string;
    divisionLabel: string;
    divisionCode: string;
    sectionLabel: string;
    sectionCode: string;
    unitName: string;
  } | null>(null);

  // Responsive mobile sidebar control
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSelectEntity = (entityData: typeof selectedEntity) => {
    setSelectedEntity(entityData);
    setMobileSidebarOpen(false); // Close sidebar drawer on mobile after selection
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0C] font-sans text-[#E0E0E6]" id="app-root">
      {/* Mobile Toggle Trigger Header */}
      <div className="md:hidden fixed top-3 left-4 z-40" id="mobile-menu-trigger-container">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 bg-[#121216] border border-[#24242B] hover:bg-[#1C1C24] text-[#E0E0E6] rounded-lg shadow-xl"
          title="Toggle Navigation Menu"
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Persistent Sidebar & Mobile Drawer Backdrop */}
      <div 
        className={`fixed inset-0 z-30 transition-opacity bg-[#0A0A0C]/80 md:hidden ${
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar Wrapper */}
      <div className={`
        fixed inset-y-0 left-0 z-35 md:relative md:z-auto shrink-0 transition-transform duration-300 transform
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} id="sidebar-wrapper">
        <SidebarTree 
          hierarchy={hierarchy} 
          flatRows={flatRows} 
          onSelectEntity={handleSelectEntity}
          activeEntity={selectedEntity?.entity || null}
          activeClassCode={selectedEntity?.classCode || null}
        />
      </div>

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative" id="workspace-wrapper">
        <SchemaView selectedEntity={selectedEntity} />
      </div>
    </div>
  );
}
