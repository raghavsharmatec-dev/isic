/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EntityRow {
  section_code: string;
  section_label: string;
  division_code: string;
  division_label: string;
  group_code: string;
  group_label: string;
  class_code: string;
  class_label: string;
  unit_name: string;
  entity: string;
}

export interface ISICClass {
  code: string;
  label: string;
  unitName: string;
  entities: string[];
  rows: EntityRow[];
}

export interface ISICGroup {
  code: string;
  label: string;
  classes: Record<string, ISICClass>;
}

export interface ISICDivision {
  code: string;
  label: string;
  groups: Record<string, ISICGroup>;
}

export interface ISICSection {
  code: string;
  label: string;
  divisions: Record<string, ISICDivision>;
}

export type ISICHierarchy = Record<string, ISICSection>;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

export function parseISICCSV(csvText: string): { hierarchy: ISICHierarchy; flatRows: EntityRow[] } {
  const lines = csvText.split(/\r?\n/);
  const flatRows: EntityRow[] = [];
  const hierarchy: ISICHierarchy = {};

  if (lines.length === 0) return { hierarchy, flatRows };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 10) continue;

    const row: EntityRow = {
      section_code: parts[0],
      section_label: parts[1],
      division_code: parts[2],
      division_label: parts[3],
      group_code: parts[4],
      group_label: parts[5],
      class_code: parts[6],
      class_label: parts[7],
      unit_name: parts[8],
      entity: parts[9],
    };
    flatRows.push(row);

    // Build recursive map
    if (!hierarchy[row.section_code]) {
      hierarchy[row.section_code] = {
        code: row.section_code,
        label: row.section_label,
        divisions: {},
      };
    }

    const section = hierarchy[row.section_code];
    if (!section.divisions[row.division_code]) {
      section.divisions[row.division_code] = {
        code: row.division_code,
        label: row.division_label,
        groups: {},
      };
    }

    const division = section.divisions[row.division_code];
    if (!division.groups[row.group_code]) {
      division.groups[row.group_code] = {
        code: row.group_code,
        label: row.group_label,
        classes: {},
      };
    }

    const group = division.groups[row.group_code];
    if (!group.classes[row.class_code]) {
      group.classes[row.class_code] = {
        code: row.class_code,
        label: row.class_label,
        unitName: row.unit_name,
        entities: [],
        rows: [],
      };
    }

    const isicClass = group.classes[row.class_code];
    if (!isicClass.entities.includes(row.entity)) {
      isicClass.entities.push(row.entity);
    }
    isicClass.rows.push(row);
  }

  return { hierarchy, flatRows };
}
