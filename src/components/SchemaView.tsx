/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Cpu, 
  FileJson, 
  Table as TableIcon, 
  Code, 
  Copy, 
  Check, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  ListRestart,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';

export interface FieldItem {
  fieldName: string;
  dataType: string;
  description: string;
  exampleValue: string;
  constraints: string;
}

export interface GeneratedSpec {
  entity: string;
  division: string;
  class: string;
  documentationSummary: string;
  fields: FieldItem[];
}

interface SchemaViewProps {
  selectedEntity: {
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
  } | null;
}

export default function SchemaView({ selectedEntity }: SchemaViewProps) {
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'json' | 'sql' | 'drizzle'>('table');
  const [copied, setCopied] = useState(false);
  
  // Keep cache of generated specs for this session to make switching seamless
  const [specCache, setSpecCache] = useState<Record<string, GeneratedSpec>>({});
  
  // Current active draft spec
  const [currentSpec, setCurrentSpec] = useState<GeneratedSpec | null>(null);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FieldItem>({
    fieldName: '',
    dataType: 'STRING',
    description: '',
    exampleValue: '',
    constraints: ''
  });

  // Adding state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FieldItem>({
    fieldName: '',
    dataType: 'STRING',
    description: '',
    exampleValue: '',
    constraints: 'Required'
  });

  // Custom API account integration credentials state
  const [showSettings, setShowSettings] = useState(false);
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('custom_gemini_api_key') || '';
  });
  const [inputKey, setInputKey] = useState<string>(customKey);
  const [showPassKey, setShowPassKey] = useState<boolean>(false);

  // Sync state if saved customKey is modified
  const handleSaveCustomKey = () => {
    const trimmed = inputKey.trim();
    localStorage.setItem('custom_gemini_api_key', trimmed);
    setCustomKey(trimmed);
    setShowSettings(false);
  };

  const handleClearCustomKey = () => {
    localStorage.removeItem('custom_gemini_api_key');
    setCustomKey('');
    setInputKey('');
    setShowSettings(false);
  };

  // Auto load already cached spec or reset when selectedEntity changes
  useEffect(() => {
    if (selectedEntity) {
      const cacheKey = `${selectedEntity.classCode}-${selectedEntity.entity}`;
      if (specCache[cacheKey]) {
        setCurrentSpec(specCache[cacheKey]);
        setError(null);
      } else {
        setCurrentSpec(null);
        setError(null);
      }
      setEditingIndex(null);
      setShowAddForm(false);
    }
  }, [selectedEntity, specCache]);

  // Loading animation simulation sequence
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setInterval(() => {
        setLoadStep(prev => {
          if (prev < 4) return prev + 1;
          return prev;
        });
      }, 900);
    } else {
      setLoadStep(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  // Command to trigger API spec call
  const generateSpecification = async () => {
    if (!selectedEntity) return;

    setLoading(true);
    setLoadStep(1);
    setError(null);
    setCurrentSpec(null);

    try {
      const response = await fetch('/api/generate-spec', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-api-key': customKey
        },
        body: JSON.stringify({
          entityName: selectedEntity.entity,
          classLabel: selectedEntity.classLabel,
          classCode: selectedEntity.classCode,
          groupLabel: selectedEntity.groupLabel,
          groupCode: selectedEntity.groupCode,
          divisionLabel: selectedEntity.divisionLabel,
          divisionCode: selectedEntity.divisionCode,
          sectionLabel: selectedEntity.sectionLabel,
          sectionCode: selectedEntity.sectionCode,
          unitName: selectedEntity.unitName
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const parsedSpec: GeneratedSpec = await response.json();
      
      const cacheKey = `${selectedEntity.classCode}-${selectedEntity.entity}`;
      setSpecCache(prev => ({
        ...prev,
        [cacheKey]: parsedSpec
      }));
      setCurrentSpec(parsedSpec);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'A network error occurred while establishing a bridge to Gemini. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Field deletion handler
  const handleDeleteField = (index: number) => {
    if (!currentSpec) return;
    const updatedFields = [...currentSpec.fields];
    updatedFields.splice(index, 1);
    setCurrentSpec({
      ...currentSpec,
      fields: updatedFields
    });
  };

  // Field Edit modes
  const handleStartEdit = (index: number, item: FieldItem) => {
    setEditingIndex(index);
    setEditForm({ ...item });
  };

  const handleSaveEdit = () => {
    if (!currentSpec || editingIndex === null) return;
    
    // Simple validation
    if (!editForm.fieldName.trim()) return;

    const updatedFields = [...currentSpec.fields];
    updatedFields[editingIndex] = { ...editForm };
    
    setCurrentSpec({
      ...currentSpec,
      fields: updatedFields
    });
    setEditingIndex(null);
  };

  // Add field helpers
  const handleAddNewField = () => {
    if (!currentSpec) return;
    if (!addForm.fieldName.trim()) return;

    const updatedFields = [...currentSpec.fields, { ...addForm }];
    setCurrentSpec({
      ...currentSpec,
      fields: updatedFields
    });

    // Reset values
    setAddForm({
      fieldName: '',
      dataType: 'STRING',
      description: '',
      exampleValue: '',
      constraints: 'Required'
    });
    setShowAddForm(false);
  };

  // Generate RAW Code views
  const sqlString = Object.freeze(useMemo(() => {
    if (!currentSpec) return '';
    const tableName = currentSpec.entity.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cols = currentSpec.fields.map(f => {
      let typeStr = 'VARCHAR(255)';
      const dt = f.dataType.toUpperCase();
      if (dt.includes('INT')) typeStr = 'INTEGER';
      else if (dt.includes('FLOAT') || dt.includes('DECIMAL') || dt.includes('NUMBER')) typeStr = 'NUMERIC(12, 2)';
      else if (dt.includes('BOOL')) typeStr = 'BOOLEAN';
      else if (dt.includes('TIMESTAMP')) typeStr = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
      else if (dt.includes('DATE')) typeStr = 'DATE';

      // Constraint checks
      let constraintPart = '';
      if (f.constraints.toLowerCase().includes('required') || f.constraints.toLowerCase().includes('not null')) {
        constraintPart = ' NOT NULL';
      }
      if (f.fieldName.toLowerCase() === 'id' || f.fieldName.toLowerCase().endsWith('id')) {
        if (f.fieldName.toLowerCase() === 'id') {
          constraintPart += ' PRIMARY KEY';
        }
      }

      return `  ${f.fieldName.padEnd(25)} ${typeStr}${constraintPart}, -- ${f.description}`;
    });

    return `/* SQL CREATE TABLE for industry-specific standard entity: ${currentSpec.entity} */
/* ISIC Class: ${currentSpec.class} */

CREATE TABLE ${tableName} (
${cols.join('\n')}
);`;
  }, [currentSpec]));

  const drizzleString = Object.freeze(useMemo(() => {
    if (!currentSpec) return '';
    const pgTableName = currentSpec.entity.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cols = currentSpec.fields.map(f => {
      let functionCall = "varchar('char_limit', { length: 255 })";
      const dt = f.dataType.toUpperCase();
      if (dt.includes('INT')) functionCall = "integer()";
      else if (dt.includes('FLOAT') || dt.includes('DECIMAL') || dt.includes('NUMBER')) functionCall = "doublePrecision()";
      else if (dt.includes('BOOL')) functionCall = "boolean()";
      else if (dt.includes('TIMESTAMP')) functionCall = "timestamp().defaultNow()";
      else if (dt.includes('DATE')) functionCall = "date()";

      let modifier = '';
      if (f.constraints.toLowerCase().includes('required') || f.constraints.toLowerCase().includes('not null')) {
        modifier += '.notNull()';
      }
      if (f.fieldName.toLowerCase() === 'id') {
        modifier += '.primaryKey()';
      }

      return `  ${f.fieldName}: ${functionCall}${modifier}, // ${f.description}`;
    });

    return `import { pgTable, serial, varchar, integer, boolean, timestamp, date, doublePrecision } from 'drizzle-orm/pg-core';

export const ${pgTableName} = pgTable('${pgTableName}', {
${cols.join('\n')}
});`;
  }, [currentSpec]));

  const jsonString = Object.freeze(useMemo(() => {
    if (!currentSpec) return '';
    return JSON.stringify({
      schemaVersion: "ISIC-1.0-Draft",
      entity: currentSpec.entity,
      classification: {
        isicClass: currentSpec.class,
        isicDivision: currentSpec.division
      },
      seniorArchitectReview: currentSpec.documentationSummary,
      databaseFields: currentSpec.fields
    }, null, 2);
  }, [currentSpec]));

  // Clipboard copies
  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Schema downloads
  const downloadJSON = () => {
    if (!currentSpec) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentSpec.entity.toLowerCase()}_schema.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadCSV = () => {
    if (!currentSpec) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "FieldName,DataType,Description,ExampleValue,Constraints\n";
    
    currentSpec.fields.forEach(f => {
      const row = [
        f.fieldName,
        f.dataType,
        f.description.replace(/"/g, '""'),
        f.exampleValue.replace(/"/g, '""'),
        f.constraints.replace(/"/g, '""')
      ].map(val => `"${val}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `${currentSpec.entity.toLowerCase()}_schema.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0C] text-[#E0E0E6] overflow-y-auto min-h-screen" id="workspace-panel">
      {/* Top Breadcrumb Navigation */}
      <div className="py-3 px-6 bg-[#121216]/50 border-b border-[#24242B] flex items-center justify-between text-xs text-[#8E9299] shrink-0 font-sans" id="breadcrumb-container">
        {selectedEntity ? (
          <div className="flex flex-wrap items-center gap-1.5 truncate">
            <span className="font-bold text-[#5C5C66] uppercase">{selectedEntity.sectionCode}</span>
            <ChevronRight className="w-3 h-3 text-[#5C5C66]" />
            <span className="text-[#8E9299] truncate max-w-[120px]">{selectedEntity.divisionLabel}</span>
            <ChevronRight className="w-3 h-3 text-[#5C5C66]" />
            <span className="text-[#8E9299] truncate max-w-[120px]">{selectedEntity.groupLabel}</span>
            <ChevronRight className="w-3 h-3 text-[#5C5C66]" />
            <span className="text-[#8E9299]">{selectedEntity.classCode}</span>
            <ChevronRight className="w-3 h-3 text-[#5C5C66]" />
            <span className="text-[#6366F1] font-semibold bg-[#1C1C24] px-1.5 py-0.5 rounded border border-[#24242B] truncate">{selectedEntity.entity}</span>
          </div>
        ) : (
          <div className="text-[#5C5C66] font-sans">No industrial concept selected</div>
        )}

        <div className="flex items-center gap-3 shrink-0" id="toolbar-addons">
          {selectedEntity && (
            <span className="text-[10px] bg-[#1C1C24] text-[#E0E0E6] border border-[#24242B] font-mono px-2 py-0.5 rounded shrink-0">
              Unit: {selectedEntity.unitName}
            </span>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded border transition-all cursor-pointer select-none ${
              customKey
                ? 'bg-[#1C1C24] text-[#6366F1] border-[#6366F1]/30 hover:bg-[#6366F1]/10'
                : 'bg-[#121216] text-[#8E9299] border-[#24242B] hover:text-[#E0E0E6]'
            }`}
            title="Configure connection to your custom Gemini API key"
            id="btn-gemini-connection-status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${customKey ? 'bg-emerald-400 animate-pulse' : 'bg-[#5C5C66]'}`} />
            <span>API: {customKey ? 'Custom Key' : 'Default'}</span>
            <Key className="w-3 h-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      {selectedEntity ? (
        <div className="flex-1 p-6 flex flex-col max-w-6xl mx-auto w-full space-y-6" id="editor-body">
          {/* Active Unit Description Hero Banner */}
          <div className="bg-[#121216] border border-[#24242B] p-6 rounded flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl" id="banner-hero">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#6366F1]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex-1 space-y-2 relative z-10">
              <span className="text-[10px] text-[#6366F1] font-bold uppercase tracking-widest block font-sans">ISIC Data Specification Standard</span>
              <h2 className="text-2xl font-bold tracking-tight text-[#E0E0E6] font-sans">{selectedEntity.entity} Schema Specification</h2>
              <p className="text-xs text-[#8E9299] leading-relaxed max-w-2xl font-sans font-medium">
                Classified under <span className="text-[#E0E0E6] font-semibold">ISIC Class {selectedEntity.classCode}: {selectedEntity.classLabel}</span>. 
                Ready to compile a database specification matching normalized enterprise metadata structures.
              </p>
            </div>

            <div className="shrink-0 flex items-center relative z-10" id="action-trigger-box">
              {currentSpec ? (
                <button 
                  onClick={generateSpecification}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1C1C24] hover:bg-[#1C1C24]/80 border border-[#24242B] text-[#E0E0E6] rounded text-sm font-semibold transition-colors disabled:opacity-40"
                  id="rebuild-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Rebuild Prototype
                </button>
              ) : (
                <button 
                  onClick={generateSpecification}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold rounded text-sm shadow-md transition-colors disabled:opacity-45 disabled:pointer-events-none"
                  id="generate-btn"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Schema Specification
                </button>
              )}
            </div>
          </div>

          {/* Loadings Screen */}
          {loading && (
            <div className="bg-[#121216] border border-[#24242B] rounded p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl relative min-h-[350px]" id="loading-mask">
              <div className="relative" id="loading-spinner-container">
                <div className="w-16 h-16 rounded-full border-4 border-[#1C1C24] border-t-[#6366F1] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#6366F1] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-[#E0E0E6] tracking-wide">Synthesizing Industrial Architecture Schema</h3>
                <p className="text-xs text-[#8E9299] font-mono select-none animate-pulse">Running Gemini Flash Engine & Checking metadata guidelines...</p>
              </div>

              {/* Step Sequence Feed */}
              <div className="w-full max-w-sm bg-[#0A0A0C] border border-[#24242B] p-4 rounded space-y-3 text-left font-mono text-[11px]" id="step-feed">
                <div className="flex items-center justify-between text-[#8E9299]">
                  <span>Engine Connection:</span>
                  <span className={loadStep >= 1 ? 'text-[#6366F1] font-bold' : 'text-[#5C5C66]'}>
                    {loadStep >= 1 ? '✓ CONNECTED' : '... CONNECTING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8E9299]">
                  <span>ISIC Division Context Mapping:</span>
                  <span className={loadStep >= 2 ? 'text-[#6366F1] font-bold' : 'text-[#5C5C66]'}>
                    {loadStep >= 2 ? '✓ CONTEXTUALIZED' : loadStep >= 1 ? '... RESEARCHING' : 'PENDING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8E9299]">
                  <span>Data Redundancy Standard Check:</span>
                  <span className={loadStep >= 3 ? 'text-[#6366F1] font-bold' : 'text-[#5C5C66]'}>
                    {loadStep >= 3 ? '✓ COMPLETED' : loadStep >= 2 ? '... OPTIMIZING' : 'PENDING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8E9299]">
                  <span>Final Blueprint Compression:</span>
                  <span className={loadStep >= 4 ? 'text-[#6366F1] font-bold' : 'text-[#5C5C66]'}>
                    {loadStep >= 4 ? '✓ FINISHED' : loadStep >= 3 ? '... COMPILING' : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fault Indicator */}
          {error && (
            <div className="p-5 bg-rose-950/30 border border-rose-900/50 rounded text-rose-200 flex items-start gap-3.5" id="error-alert">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-rose-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-rose-100">AI Architect Failed to Map Specification</h4>
                <p className="text-xs text-rose-350 leading-relaxed font-sans">{error}</p>
                <button 
                  onClick={generateSpecification}
                  className="mt-3 text-xs bg-rose-900/60 hover:bg-rose-900 px-3 py-1.5 border border-[#24242B] rounded transition-colors"
                >
                  Retry Generation
                </button>
              </div>
            </div>
          )}

          {/* Schema Loaded Output View Panels */}
          {currentSpec && !loading && (
            <div className="space-y-6" id="results-block">
              {/* Tabs selector */}
              <div className="flex border-b border-[#24242B] text-xs font-medium" id="tabs-header">
                <button 
                  onClick={() => { setActiveTab('table'); setEditingIndex(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-all ${
                    activeTab === 'table' ? 'border-[#6366F1] text-[#6366F1] bg-[#1C1C24]/30' : 'border-transparent text-[#8E9299] hover:text-[#E0E0E6]'
                  }`}
                  id="tab-btn-table"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Visual Field Planner
                </button>
                <button 
                  onClick={() => { setActiveTab('json'); setEditingIndex(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-all ${
                    activeTab === 'json' ? 'border-[#6366F1] text-[#6366F1] bg-[#1C1C24]/30' : 'border-transparent text-[#8E9299] hover:text-[#E0E0E6]'
                  }`}
                  id="tab-btn-json"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  JSON Spec
                </button>
                <button 
                  onClick={() => { setActiveTab('sql'); setEditingIndex(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-all ${
                    activeTab === 'sql' ? 'border-[#6366F1] text-[#6366F1] bg-[#1C1C24]/30' : 'border-transparent text-[#8E9299] hover:text-[#E0E0E6]'
                  }`}
                  id="tab-btn-sql"
                >
                  <Code className="w-3.5 h-3.5" />
                  PostgreSQL DDL
                </button>
                <button 
                  onClick={() => { setActiveTab('drizzle'); setEditingIndex(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-all ${
                    activeTab === 'drizzle' ? 'border-[#6366F1] text-[#6366F1] bg-[#1C1C24]/30' : 'border-transparent text-[#8E9299] hover:text-[#E0E0E6]'
                  }`}
                  id="tab-btn-drizzle"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Drizzle Schema
                </button>
              </div>

              {/* Raw Spec Summary Description Paper Card */}
              {currentSpec.documentationSummary && (
                <div className="bg-[#121216] border border-[#24242B] rounded p-5 flex gap-3.5 items-start" id="doc-overview-card">
                  <div className="p-2 bg-[#0A0A0C] rounded border border-[#24242B] text-[#6366F1] mt-1">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5 flex-1 font-sans">
                    <h4 className="text-xs font-semibold tracking-wider text-[#8E9299] uppercase">Architectural Rationale Document</h4>
                    <p className="text-sm text-[#E0E0E6] leading-relaxed font-sans">{currentSpec.documentationSummary}</p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: table view */}
              {activeTab === 'table' && (
                <div className="bg-[#121216] border border-[#24242B] rounded overflow-hidden shadow-xl" id="table-tab-panel">
                  <div className="p-4 bg-[#0A0A0C] border-b border-[#24242B] flex items-center justify-between" id="table-panel-header">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8E9299] font-sans">Database table fields: {currentSpec.fields.length} item(s)</span>
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C24] hover:bg-[#1C1C24]/85 border border-[#24242B] text-[#E0E0E6] rounded text-xs transition-colors"
                      id="add-field-trigger"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Custom Field
                    </button>
                  </div>

                  {/* Add Field Inline Modal Form */}
                  {showAddForm && (
                    <div className="p-4 bg-[#0A0A0C] border-b border-[#24242B] grid grid-cols-1 md:grid-cols-5 gap-3 text-xs" id="add-field-form">
                      <div>
                        <label className="block text-[10px] text-[#5C5C66] mb-1 font-mono uppercase">Field Name</label>
                        <input 
                          type="text" 
                          placeholder="fieldName"
                          value={addForm.fieldName}
                          onChange={e => setAddForm({...addForm, fieldName: e.target.value})}
                          className="w-full bg-[#1C1C24] border border-[#24242B] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#6366F1] text-[#E0E0E6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5C5C66] mb-1 font-mono uppercase">Data Type</label>
                        <select 
                          value={addForm.dataType}
                          onChange={e => setAddForm({...addForm, dataType: e.target.value})}
                          className="w-full bg-[#1C1C24] border border-[#24242B] p-1.5 rounded focus:outline-none focus:border-[#6366F1] text-[#E0E0E6]"
                        >
                          <option value="STRING">STRING</option>
                          <option value="INTEGER">INTEGER</option>
                          <option value="DECIMAL">DECIMAL (12, 2)</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DATE">DATE</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-[#5C5C66] mb-1 font-mono uppercase">Description</label>
                        <input 
                          type="text" 
                          placeholder="Purpose within standard"
                          value={addForm.description}
                          onChange={e => setAddForm({...addForm, description: e.target.value})}
                          className="w-full bg-[#1C1C24] border border-[#24242B] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#6366F1] text-[#E0E0E6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5C5C66] mb-1 font-mono uppercase">Example / Constraints</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Example value"
                            value={addForm.exampleValue}
                            onChange={e => setAddForm({...addForm, exampleValue: e.target.value})}
                            className="bg-[#1C1C24] border border-[#24242B] px-2 py-1.5 rounded focus:outline-none focus:border-[#6366F1] text-[#E0E0E6] flex-1 min-w-0"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-5 flex justify-end gap-2.5 pt-1.5 border-t border-[#24242B] mt-1">
                        <button 
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-1.5 bg-[#1C1C24] hover:bg-[#1C1C24]/80 rounded text-[#8E9299] hover:text-[#E0E0E6] transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddNewField}
                          disabled={!addForm.fieldName.trim()}
                          className="px-4 py-1.5 bg-[#6366F1] hover:bg-[#6366F1]/90 disabled:opacity-40 text-white font-semibold rounded transition"
                        >
                          Add to Specifications
                        </button>
                      </div>
                    </div>
                  )}

                  {currentSpec.fields.length === 0 ? (
                    <div className="p-12 text-center text-[#8E9299] font-sans" id="empty-fields">
                      <AlertTriangle className="w-8 h-8 text-[#5C5C66] mx-auto mb-2" />
                      <p>All database tables require at least one field. Use 'Add Custom Field' to start manually.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto" id="table-display-scrollbar">
                      <table className="w-full text-left" id="schema-table">
                        <thead>
                          <tr className="bg-[#0A0A0C] border-b border-[#24242B] text-[10px] text-[#8E9299] tracking-wider font-mono">
                            <th className="py-3 px-4 w-[22%]">Field Name (CamelCase)</th>
                            <th className="py-3 px-4 w-[13%]">Schema Type</th>
                            <th className="py-3 px-4 w-[35%]">Contextual Description</th>
                            <th className="py-3 px-4 w-[13%]">Example Value</th>
                            <th className="py-3 px-4 w-[12%]">Constraints</th>
                            <th className="py-3 px-4 w-[5%] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#24242B] text-xs">
                          {currentSpec.fields.map((field, idx) => {
                            const isEditing = editingIndex === idx;

                            if (isEditing) {
                              return (
                                <tr key={idx} className="bg-[#0A0A0C]/40 p-2" id={`field-row-edit-${idx}`}>
                                  <td className="py-2.5 px-4 font-mono">
                                    <input 
                                      type="text" 
                                      value={editForm.fieldName}
                                      onChange={e => setEditForm({ ...editForm, fieldName: e.target.value })}
                                      className="w-full bg-[#1C1C24] border border-[#24242B] px-2 py-1 rounded text-[#E0E0E6] text-xs font-mono"
                                    />
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <select 
                                      value={editForm.dataType}
                                      onChange={e => setEditForm({ ...editForm, dataType: e.target.value })}
                                      className="w-full bg-[#1C1C24] border border-[#24242B] p-1 rounded text-[#E0E0E6] text-xs font-sans"
                                    >
                                      <option value="STRING">STRING</option>
                                      <option value="INTEGER">INTEGER</option>
                                      <option value="DECIMAL">DECIMAL (12, 2)</option>
                                      <option value="BOOLEAN">BOOLEAN</option>
                                      <option value="DATE">DATE</option>
                                      <option value="TIMESTAMP">TIMESTAMP</option>
                                    </select>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <textarea
                                      rows={2}
                                      value={editForm.description}
                                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                      className="w-full bg-[#1C1C24] border border-[#24242B] px-2 py-1 rounded text-[#E0E0E6] text-xs font-sans"
                                    />
                                  </td>
                                  <td className="py-2.5 px-4 font-mono">
                                    <input 
                                      type="text" 
                                      value={editForm.exampleValue}
                                      onChange={e => setEditForm({ ...editForm, exampleValue: e.target.value })}
                                      className="w-full bg-[#1C1C24] border border-[#24242B] px-2 py-1 rounded text-[#E0E0E6] text-xs font-mono"
                                    />
                                  </td>
                                  <td className="py-2.5 px-4 font-sans text-[#8E9299]">
                                    <input 
                                      type="text" 
                                      value={editForm.constraints}
                                      onChange={e => setEditForm({ ...editForm, constraints: e.target.value })}
                                      className="w-full bg-[#1C1C24] border border-[#24242B] px-2 py-1 rounded text-[#E0E0E6] text-xs font-sans"
                                    />
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <div className="flex gap-1 justify-end">
                                      <button 
                                        onClick={handleSaveEdit}
                                        className="p-1 px-2.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded hover:bg-emerald-900 text-[10px]"
                                        title="Save edits"
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => setEditingIndex(null)}
                                        className="p-1 px-1.5 bg-[#1C1C24] text-[#8E9299] hover:text-[#E0E0E6] rounded text-[10px]"
                                        title="Cancel edits"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={idx} className="hover:bg-[#1C1C24]/30 relative group" id={`field-row-${idx}`}>
                                <td className="py-3 px-4 font-mono font-semibold text-[#E0E0E6] break-all">{field.fieldName}</td>
                                <td className="py-3 px-4">
                                  <span className="font-mono bg-[#0A0A0C] px-1.5 py-0.5 rounded text-[10px] text-[#8E9299] border border-[#24242B]">
                                    {field.dataType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[#E0E0E6] leading-relaxed font-sans">{field.description}</td>
                                <td className="py-3 px-4 font-mono text-[#8E9299]">{field.exampleValue || '-'}</td>
                                <td className="py-3 px-4 font-sans text-[#8E9299] text-[11px]">
                                  {field.constraints ? (
                                    <span className="bg-[#0A0A0C] border border-[#24242B] px-2 py-0.5 rounded font-sans text-[#8E9299]">
                                      {field.constraints}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center gap-1 justify-end md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleStartEdit(idx, field)}
                                      className="p-1 text-[#8E9299] hover:text-[#E0E0E6] hover:bg-[#1C1C24] rounded"
                                      title="Edit details"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteField(idx)}
                                      className="p-1 text-[#8E9299] hover:text-rose-450 hover:bg-[#1C1C24] rounded"
                                      title="Delete field"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: raw json view */}
              {activeTab === 'json' && (
                <div className="bg-[#121216] border border-[#24242B] rounded overflow-hidden shadow-xl relative" id="json-tab-panel">
                  <div className="p-3 bg-[#0A0A0C] border-b border-[#24242B] flex items-center justify-between" id="json-panel-header">
                    <span className="text-[10px] font-mono text-[#8E9299]">JSON Schema Definition</span>
                    <button 
                      onClick={() => triggerCopy(jsonString)}
                      className="p-1 px-2.5 bg-[#1C1C24] hover:bg-[#1C1C24]/80 text-[#E0E0E6] rounded text-xs flex items-center gap-1 border border-[#24242B]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-[11px] text-[#8E9299] bg-[#0A0A0C] overflow-x-auto leading-relaxed max-h-[500px]">
                    <code>{jsonString}</code>
                  </pre>
                </div>
              )}

              {/* TAB CONTENT: SQL view */}
              {activeTab === 'sql' && (
                <div className="bg-[#121216] border border-[#24242B] rounded overflow-hidden shadow-xl relative" id="sql-tab-panel">
                  <div className="p-3 bg-[#0A0A0C] border-b border-[#24242B] flex items-center justify-between" id="sql-panel-header">
                    <span className="text-[10px] font-mono text-[#8E9299]">PostgreSQL DDL Syntax</span>
                    <button 
                      onClick={() => triggerCopy(sqlString)}
                      className="p-1 px-2.5 bg-[#1C1C24] hover:bg-[#1C1C24]/80 text-[#E0E0E6] rounded text-xs flex items-center gap-1 border border-[#24242B]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-[11px] text-[#8E9299] bg-[#0A0A0C] overflow-x-auto leading-relaxed max-h-[500px]">
                    <code>{sqlString}</code>
                  </pre>
                </div>
              )}

              {/* TAB CONTENT: Drizzle Schema View */}
              {activeTab === 'drizzle' && (
                <div className="bg-[#121216] border border-[#24242B] rounded overflow-hidden shadow-xl relative" id="drizzle-tab-panel">
                  <div className="p-3 bg-[#0A0A0C] border-b border-[#24242B] flex items-center justify-between" id="drizzle-panel-header">
                    <span className="text-[10px] font-mono text-[#8E9299]">Drizzle Core ORM schema.ts definition</span>
                    <button 
                      onClick={() => triggerCopy(drizzleString)}
                      className="p-1 px-2.5 bg-[#1C1C24] hover:bg-[#1C1C24]/80 text-[#E0E0E6] rounded text-xs flex items-center gap-1 border border-[#24242B]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-[11px] text-[#8E9299] bg-[#0A0A0C] overflow-x-auto leading-relaxed max-h-[500px]">
                    <code>{drizzleString}</code>
                  </pre>
                </div>
              )}

              {/* Floating Bottom action control bar for schema exports */}
              <div className="p-5 bg-[#121216] border border-[#24242B] rounded flex items-center justify-between gap-4 shadow-lg" id="action-control-bar">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#6366F1] shrink-0" />
                  <span className="text-xs text-[#8E9299] font-sans font-medium">Blueprint Verified & Validated. Ready to export files.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={downloadCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0A0A0C] hover:bg-[#1C1C24] text-[#E0E0E6] rounded text-xs border border-[#24242B] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8E9299]" />
                    Download Table CSV
                  </button>
                  <button 
                    onClick={downloadJSON}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold rounded text-xs border border-[#24242B] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Download JSON Spec
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Initial State Panel when Entity selected but no Spec Generated yet */}
          {!currentSpec && !loading && !error && (
            <div className="bg-[#121216] border border-[#24242B] p-12 text-center rounded flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto shadow-inner" id="generate-spec-promotional-mask">
              <span className="p-3 bg-[#0A0A0C] border border-[#24242B] rounded text-[#6366F1]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#E0E0E6] font-sans">Compile Enterprise Spec Draft</h3>
                <p className="text-xs text-[#8E9299] leading-relaxed font-sans">
                  Generate structural table metadata complete with CamelCase fields, normalized data types, validations, and constraints tailored to standard compliance practices in standard industry contexts.
                </p>
              </div>
              <button 
                onClick={generateSpecification}
                className="px-5 py-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold rounded text-xs md:text-sm shadow transition-all"
              >
                Synthesize Architectural Specification
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Unselected Prompt Screen */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-md mx-auto" id="unselected-prompt">
          <span className="p-4 bg-[#121216] text-[#6366F1] rounded-3xl border border-[#24242B] shadow-inner">
            <Database className="w-8 h-8 stroke-[1.5]" />
          </span>

          <div className="space-y-1.5">
            <h3 className="text-md font-bold text-[#E0E0E6]">No Industrial Classification Selected</h3>
            <p className="text-xs text-[#8E9299] leading-relaxed">
              Navigate the international ISIC standard category tree on the left. Click on any classification leaf entity to setup, generate, and export customized developer relational database models.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px] text-[#8E9299] bg-[#1C1C24] border border-[#24242B] px-3 py-1.5 rounded font-mono">
            <span>A</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span>01</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span>01.1</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span>01.11</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-[#6366F1]">Farm</span>
          </div>
        </div>
      )}

      {/* Connection configuration settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans" id="settings-modal-bg">
          <div className="bg-[#121216] border border-[#24242B] w-full max-w-md p-6 rounded shadow-2xl relative space-y-4 text-xs text-[#8E9299]" id="settings-modal-content">
            <button 
              onClick={() => { setShowSettings(false); setInputKey(customKey); }}
              className="absolute top-4 right-4 text-[#8E9299] hover:text-[#E0E0E6] cursor-pointer"
              id="close-settings-btn"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5" id="settings-title-row">
              <span className="p-2 bg-[#1C1C24] text-[#6366F1] rounded">
                <Key className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#E0E0E6]">Gemini API Account Integration</h3>
                <p className="text-[10px] text-[#8E9299] mt-0.5">Configure your custom service credentials</p>
              </div>
            </div>

            <hr className="border-[#24242B]" />

            <div className="space-y-3 leading-normal text-[#8E9299]">
              <p>
                By default, this application connects to the primary workspace's shared API context. Regular users accessing shared preview links or viewing from different machines can supply their personal Gemini keys.
              </p>
              <p className="p-2.5 bg-[#0A0A0C] border border-[#24242B] text-[11px] text-[#A2A6B0] rounded-sm italic leading-relaxed">
                <strong>🔒 Security Notice:</strong> Key credentials are used strictly on request headers to generate schemas, and are saved directly in your personal secure client-side browser storage (never persisted on our database).
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] text-[#E0E0E6] uppercase tracking-wider font-semibold">Gemini API Key</label>
              <div className="relative">
                <input 
                  type={showPassKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#0A0A0C] border border-[#24242B] py-2 px-3 pr-10 rounded text-[#E0E0E6] font-mono text-xs focus:outline-none focus:border-[#6366F1] transition-colors placeholder-[#5C5C66]"
                  id="gemini-api-key-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassKey(!showPassKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5C66] hover:text-[#8E9299] cursor-pointer"
                  title={showPassKey ? "Hide API key" : "Show API key"}
                  id="toggle-visibility-key"
                >
                  {showPassKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-[#5C5C66]">
                Retrieve your key from the free{' '}
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#6366F1] hover:underline"
                >
                  Google AI Studio Console
                </a>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#24242B]">
              {customKey ? (
                <button
                  onClick={handleClearCustomKey}
                  className="px-3 py-1.5 bg-[#1C1C24] hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded transition cursor-pointer"
                  id="disconnect-custom-key-btn"
                >
                  Disconnect Key
                </button>
              ) : (
                <span className="text-[10px] text-[#5C5C66] italic">Using standard workspace key fallback</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowSettings(false); setInputKey(customKey); }}
                  className="px-3.5 py-1.5 hover:bg-[#1C1C24] text-[#8E9299] hover:text-[#E0E0E6] rounded transition cursor-pointer"
                  id="cancel-settings-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomKey}
                  disabled={!inputKey.trim()}
                  className="px-4 py-1.5 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold rounded disabled:opacity-45 transition cursor-pointer"
                  id="save-custom-key-btn"
                >
                  Connect Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
