/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Sprout, 
  Flame, 
  Factory, 
  Zap, 
  Droplet, 
  Hammer, 
  ShoppingBag, 
  Truck, 
  Hotel, 
  Cpu, 
  Coins, 
  Home, 
  Scale, 
  Users, 
  Shield, 
  GraduationCap, 
  HeartPulse, 
  Palette, 
  Wrench, 
  Briefcase, 
  Globe, 
  Search, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  FileText,
  X,
  Database
} from 'lucide-react';
import { ISICHierarchy, EntityRow, ISICSection, ISICDivision, ISICGroup, ISICClass } from '../utils/csvParser';

interface SidebarTreeProps {
  hierarchy: ISICHierarchy;
  flatRows: EntityRow[];
  onSelectEntity: (entity: {
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
  }) => void;
  activeEntity: string | null;
  activeClassCode: string | null;
}

// Icon mapper helper
const getSectionIcon = (code: string) => {
  switch (code) {
    case 'A': return Sprout;
    case 'B': return Flame;
    case 'C': return Factory;
    case 'D': return Zap;
    case 'E': return Droplet;
    case 'F': return Hammer;
    case 'G': return ShoppingBag;
    case 'H': return Truck;
    case 'I': return Hotel;
    case 'J': return Cpu;
    case 'K': return Coins;
    case 'L': return Home;
    case 'M': return Scale;
    case 'N': return Users;
    case 'O': return Shield;
    case 'P': return GraduationCap;
    case 'Q': return HeartPulse;
    case 'R': return Palette;
    case 'S': return Wrench;
    case 'T': return Briefcase;
    case 'U': return Globe;
    default: return Database;
  }
};

export default function SidebarTree({ 
  hierarchy, 
  flatRows, 
  onSelectEntity, 
  activeEntity,
  activeClassCode
}: SidebarTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Reset search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Filter & match calculation
  const filteredHierarchy = useMemo(() => {
    if (!searchTerm.trim()) {
      return hierarchy;
    }

    const term = searchTerm.toLowerCase();
    const result: ISICHierarchy = {};
    const autoExpand: Record<string, boolean> = {};

    // Map through Sections
    Object.keys(hierarchy).forEach(sCode => {
      const section = hierarchy[sCode];
      const matchS = section.label.toLowerCase().includes(term) || section.code.toLowerCase().includes(term);
      
      const filteredDivisions: Record<string, ISICDivision> = {};

      Object.keys(section.divisions).forEach(dCode => {
        const division = section.divisions[dCode];
        const matchD = division.label.toLowerCase().includes(term) || division.code.toLowerCase().includes(term);

        const filteredGroups: Record<string, ISICGroup> = {};

        Object.keys(division.groups).forEach(gCode => {
          const group = division.groups[gCode];
          const matchG = group.label.toLowerCase().includes(term) || group.code.toLowerCase().includes(term);

          const filteredClasses: Record<string, ISICClass> = {};

          Object.keys(group.classes).forEach(cCode => {
            const isicClass = group.classes[cCode];
            const matchC = isicClass.label.toLowerCase().includes(term) || isicClass.code.toLowerCase().includes(term);

            const matchedEntities = isicClass.entities.filter(e => e.toLowerCase().includes(term));

            if (matchC || matchedEntities.length > 0 || matchG || matchD || matchS) {
              filteredClasses[cCode] = {
                ...isicClass,
                entities: matchedEntities.length > 0 || matchC ? isicClass.entities : []
              };
              // Auto-expand parents if matching children found
              autoExpand[`class-${cCode}`] = true;
              autoExpand[`group-${gCode}`] = true;
              autoExpand[`div-${dCode}`] = true;
              autoExpand[`sec-${sCode}`] = true;
            }
          });

          if (Object.keys(filteredClasses).length > 0 || matchG || matchD || matchS) {
            filteredGroups[gCode] = {
              ...group,
              classes: Object.keys(filteredClasses).length > 0 ? filteredClasses : group.classes
            };
            autoExpand[`group-${gCode}`] = true;
            autoExpand[`div-${dCode}`] = true;
            autoExpand[`sec-${sCode}`] = true;
          }
        });

        if (Object.keys(filteredGroups).length > 0 || matchD || matchS) {
          filteredDivisions[dCode] = {
            ...division,
            groups: Object.keys(filteredGroups).length > 0 ? filteredGroups : division.groups
          };
          autoExpand[`div-${dCode}`] = true;
          autoExpand[`sec-${sCode}`] = true;
        }
      });

      if (Object.keys(filteredDivisions).length > 0 || matchS) {
        result[sCode] = {
          ...section,
          divisions: Object.keys(filteredDivisions).length > 0 ? filteredDivisions : section.divisions
        };
      }
    });

    // Update expanded state for searched nodes automatically
    if (Object.keys(autoExpand).length > 0) {
      setExpandedNodes(prev => ({ ...prev, ...autoExpand }));
    }

    return result;
  }, [hierarchy, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#121216] border-r border-[#24242B] text-[#E0E0E6] w-80 md:w-96 shrink-0 font-sans" id="sidebar-panel">
      {/* Search Header */}
      <div className="p-6 border-b border-[#24242B]" id="sidebar-header">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-[#6366F1] stroke-[2]" id="logo-icon" />
          <div>
            <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-[#8E9299]" id="app-title">Industry Schema Architect</h1>
            <p className="text-[10px] text-[#5C5C66] mt-1 font-sans" id="app-version">ISIC Revision 4.0 Standard</p>
          </div>
        </div>

        <div className="relative" id="sidebar-search-container">
          <Search className="w-3.5 h-3.5 text-[#5C5C66] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search classes, codes, entities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs py-2 pl-9 pr-8 bg-[#1C1C24] text-[#E0E0E6] placeholder-[#5C5C66] border border-[#24242B] rounded focus:outline-none focus:border-[#6366F1] transition-colors"
            id="sidebar-search-input"
          />
          {searchTerm && (
            <button 
              onClick={clearSearch} 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5C5C66] hover:text-[#E0E0E6]"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tree Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs" id="sidebar-tree-container">
        {Object.keys(filteredHierarchy).length === 0 ? (
          <div className="text-center py-12 px-4" id="sidebar-no-results">
            <span className="inline-block p-2 bg-[#1C1C24] rounded-full text-[#5C5C66] mb-2">
              <Search className="w-5 h-5" />
            </span>
            <p className="text-xs text-[#8E9299]">No matching ISIC classifications or entities found.</p>
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="mt-3 text-xs text-[#6366F1] hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          Object.keys(filteredHierarchy).map(sCode => {
            const section = filteredHierarchy[sCode];
            const secId = `sec-${sCode}`;
            const isSecExpanded = !!expandedNodes[secId];
            const SectionIcon = getSectionIcon(sCode);

            return (
              <div key={sCode} className="space-y-2" id={`section-block-${sCode}`}>
                {/* Section Row */}
                <button 
                  onClick={() => toggleNode(secId)}
                  className={`w-full flex items-center justify-between gap-2 text-xs font-semibold text-[#8E9299] py-1 px-2 hover:bg-[#1C1C24]/30 rounded transition-colors ${isSecExpanded ? 'text-[#E0E0E6]' : 'opacity-60'}`}
                  id={`btn-section-${sCode}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <SectionIcon className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                    <span className="truncate">SECTION {section.code}: {section.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-[#5C5C66] shrink-0 transition-transform ${isSecExpanded ? 'rotate-90 text-[#8E9299]' : ''}`} />
                </button>

                {/* Divisions */}
                {isSecExpanded && (
                  <div className="pl-2 mt-1 border-l border-[#24242B] ml-2 space-y-2" id={`section-divs-${sCode}`}>
                    {Object.keys(section.divisions).map(dCode => {
                      const division = section.divisions[dCode];
                      const divId = `div-${dCode}`;
                      const isDivExpanded = !!expandedNodes[divId];

                      return (
                        <div key={dCode} id={`div-block-${dCode}`} className="space-y-1">
                          {/* Division Row */}
                          <button 
                            onClick={() => toggleNode(divId)}
                            className={`w-full flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-sm transition-colors ${isDivExpanded ? 'bg-[#1C1C24] text-[#6366F1]' : 'text-[#8E9299] hover:bg-[#1C1C24]/30'}`}
                            id={`btn-div-${dCode}`}
                          >
                            <div className="truncate flex items-center gap-1.5">
                              <span className="font-mono bg-[#0A0A0C] px-1 py-0.5 rounded text-[#6366F1] text-[10px] font-bold">Div {division.code}</span>
                              <span className="truncate text-xs font-medium">{division.label}</span>
                            </div>
                            <ChevronRight className={`w-3 h-3 text-[#5C5C66] shrink-0 transition-transform ${isDivExpanded ? 'rotate-90' : ''}`} />
                          </button>

                          {/* Groups */}
                          {isDivExpanded && (
                            <div className="pl-3 mt-1 border-l border-[#24242B] ml-2.5 space-y-1" id={`div-groups-${dCode}`}>
                              {Object.keys(division.groups).map(gCode => {
                                const group = division.groups[gCode];
                                const groupId = `group-${gCode}`;
                                const isGroupExpanded = !!expandedNodes[groupId];

                                return (
                                  <div key={gCode} id={`group-block-${gCode}`} className="space-y-0.5">
                                    {/* Group Row */}
                                    <button 
                                      onClick={() => toggleNode(groupId)}
                                      className={`w-full flex items-center justify-between gap-1 py-1 px-2 rounded text-left transition-colors text-[11px] ${isGroupExpanded ? 'text-[#E0E0E6] bg-[#1C1C24]/10' : 'text-[#8E9299] hover:bg-[#1C1C24]/20'}`}
                                      id={`btn-group-${gCode}`}
                                    >
                                      <div className="truncate flex items-center gap-1">
                                        <span className="font-mono text-[#5C5C66] text-[9px]">{group.code}</span>
                                        <span className="truncate text-[#8E9299]">Group {group.label}</span>
                                      </div>
                                      <ChevronRight className={`w-2.5 h-2.5 text-[#5C5C66] shrink-0 transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`} />
                                    </button>

                                    {/* Classes */}
                                    {isGroupExpanded && (
                                      <div className="pl-2 border-l border-[#24242B] ml-1.5 space-y-0.5" id={`group-classes-${gCode}`}>
                                        {Object.keys(group.classes).map(cCode => {
                                          const isicClass = group.classes[cCode];
                                          const classId = `class-${cCode}`;
                                          const isClassExpanded = !!expandedNodes[classId];

                                          return (
                                            <div key={cCode} id={`class-block-${cCode}`} className="space-y-0.5">
                                              {/* Class Row */}
                                              <button 
                                                onClick={() => toggleNode(classId)}
                                                className={`w-full flex items-center gap-1.5 py-1 px-2 text-left rounded transition-colors text-[11px] ${isClassExpanded ? 'text-[#E0E0E6] font-medium border-l-2 border-[#6366F1] bg-[#1C1C24]/50' : 'text-[#8E9299] hover:bg-[#1C1C24]/20'}`}
                                                id={`btn-class-${cCode}`}
                                              >
                                                <span className="shrink-0">
                                                  {isClassExpanded ? (
                                                    <FolderOpen className="w-3 h-3 text-[#6366F1]" />
                                                  ) : (
                                                    <Folder className="w-3 h-3 text-[#5C5C66]" />
                                                  )}
                                                </span>
                                                <div className="truncate">
                                                  <span className="font-mono text-[9px] mr-1 text-[#5C5C66]">{isicClass.code}</span>
                                                  <span>{isicClass.label}</span>
                                                </div>
                                              </button>

                                              {/* Entities (Leaf Nodes) */}
                                              {isClassExpanded && (
                                                <div className="pl-4 ml-1.5 py-1 space-y-1" id={`class-entities-${cCode}`}>
                                                  {isicClass.entities.map(entName => {
                                                    const isLeafActive = activeEntity === entName && activeClassCode === isicClass.code;
                                                    return (
                                                      <button
                                                        key={entName}
                                                        onClick={() => onSelectEntity({
                                                          entity: entName,
                                                          classLabel: isicClass.label,
                                                          classCode: isicClass.code,
                                                          groupLabel: group.label,
                                                          groupCode: group.code,
                                                          divisionLabel: division.label,
                                                          divisionCode: division.code,
                                                          sectionLabel: section.label,
                                                          sectionCode: section.code,
                                                          unitName: isicClass.unitName
                                                        })}
                                                        className={`w-full text-left text-[10px] py-1 px-3 rounded-sm transition-all flex items-center gap-1.5 ${
                                                          isLeafActive 
                                                            ? 'text-[#6366F1] font-bold ring-1 ring-[#6366F1]/20 bg-[#1C1C24]' 
                                                            : 'text-[#5C5C66] hover:text-[#6366F1]'
                                                        }`}
                                                        id={`entity-leaf-${cCode}-${entName}`}
                                                      >
                                                        <FileText className="w-2.5 h-2.5 shrink-0" />
                                                        <span className="truncate">{entName}</span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-4 bg-[#0A0A0C] border-t border-[#24242B] text-[10px] text-[#5C5C66] italic" id="sidebar-footer-info">
        Selected Node ID: {activeEntity ? `ISIC-V4-${activeClassCode}-${activeEntity.substring(0, 3).replace(/\s+/g,'').toUpperCase()}` : 'None'}
      </div>
    </div>
  );
}
