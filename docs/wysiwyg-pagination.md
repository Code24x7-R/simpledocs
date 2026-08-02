# WYSIWYG Pagination scheme and intructions
### System Instruction: Document Layout & Pagination Engine Implementation

You are an expert Systems & Frontend Architecture Engineer. Your task is to implement a production-grade, deterministic **WYSIWYG Pagination and Layout Engine** in **TypeScript** based on the provided JSON Schema specification.

---

## 1. Primary Objectives
Implement a core class named `DocumentLayoutEngine` that processes a document AST, geometry, and typography defaults to produce a calculated array of `PageOutput` structures.

### Key Requirements
1. **Two-Phase Rendering Engine**:
   * **Phase 1 (Line Wrapping)**: Break paragraph block text into an array of line boxes using character width metrics. Support both `fixed` (character width calculation) and `proportional` (via a supplied `MeasureTextFn` dependency) fonts.
   * **Phase 2 (Page Stack Allocation)**: Sequentially place lines onto pages using vertical space tracking (`current_y`), auto-creating new pages when usable space ($H_{\text{usable}}$) is exceeded.
2. **Strict Geometry Compliance**:
   $$H_{\text{usable}} = \text{Height}_{\text{page}} - \text{Margin}_{\text{top}} - \text{Margin}_{\text{bottom}} - \text{Header}_{\text{height}} - \text{Footer}_{\text{height}}$$
   Every line height must be calculated as:
   $$\text{Height}_{\text{line}} = (\text{Font Size} \times \text{Line Spacing Multiplier}) + \text{Padding}_{\text{top}} + \text{Padding}_{\text{bottom}}$$
3. **Hard Page Breaks**: Instantly close the current page frame and move the cursor to `current_y = 0` on Page $N+1$ when encountering a `manual_page_break` AST node.
4. **Widow & Orphan Suppression**:
   * **Orphan Control**: If splitting a paragraph leaves fewer lines than `paginationRules.orphans` at the bottom of Page $N$, move the **entire paragraph** (or all preceding lines on Page $N$) to Page $N+1$.
   * **Widow Control**: If pushing remaining lines to Page $N+1$ creates fewer lines on Page $N+1$ than `paginationRules.widows`, pull line(s) down from Page $N$ to Page $N+1$ so the widow threshold is satisfied.
5. **Keep With Next**: If a node has `keepWithNext: true` (e.g., headings), it must not be left as the last line/block on a page if the following block is pushed to the next page. Move the node to the next page alongside the subsequent block.

---

## 2. API Contract & Interface Definitions

```typescript
export type MeasurementUnit = 'pt' | 'px' | 'mm' | 'in';
export type FontType = 'proportional' | 'fixed';

export interface PageGeometry {
  unit: MeasurementUnit;
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number };
  headerHeight: number;
  footerHeight: number;
}

export interface TypographyDefaults {
  fontFamily: string;
  fontType: FontType;
  fontSize: number;
  lineHeightMultiplier: number;
  fixedCharacterWidth?: number;
}

export interface PaginationRules {
  orphans: number;
  widows: number;
  keepWithNext: boolean;
}

export interface ASTNode {
  id: string;
  type: 'paragraph' | 'manual_page_break' | 'header' | 'footer';
  text?: string;
  styleOverrides?: {
    fontSize?: number;
    fontType?: FontType;
    lineHeightMultiplier?: number;
    marginTop?: number;
    marginBottom?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  paginationRules?: Partial<PaginationRules>;
}

export interface LineBox {
  lineIndex: number;
  text: string;
  width: number;
  height: number;
  baselineY: number;
}

export interface RenderedBlock {
  nodeId: string;
  startY: number;
  endY: number;
  lines: LineBox[];
}

export interface PageOutput {
  pageIndex: number;
  usableHeight: number;
  renderedBlocks: RenderedBlock[];
}

export type MeasureTextFn = (text: string, fontStyle: { fontFamily: string; fontSize: number }) => number;

export interface DocumentConfig {
  pageGeometry: PageGeometry;
  typographyDefaults: TypographyDefaults;
  documentAST: ASTNode[];
}`
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WYSIWYGLayoutAndPaginationEngine",
  "description": "Schema defining document geometry, typography parameters, AST nodes, and pagination output for standard text engines.",
  "type": "object",
  "required": ["pageGeometry", "typographyDefaults", "documentAST"],
  "properties": {
    "pageGeometry": {
      "type": "object",
      "description": "Physical page measurements and boundaries.",
      "required": ["unit", "width", "height", "margins", "headerHeight", "footerHeight"],
      "properties": {
        "unit": {
          "type": "string",
          "enum": ["pt", "px", "mm", "in"],
          "default": "pt"
        },
        "width": { "type": "number", "minimum": 0, "example": 612 },
        "height": { "type": "number", "minimum": 0, "example": 792 },
        "margins": {
          "type": "object",
          "required": ["top", "bottom", "left", "right"],
          "properties": {
            "top": { "type": "number", "minimum": 0, "example": 72 },
            "bottom": { "type": "number", "minimum": 0, "example": 72 },
            "left": { "type": "number", "minimum": 0, "example": 72 },
            "right": { "type": "number", "minimum": 0, "example": 72 }
          }
        },
        "headerHeight": { "type": "number", "minimum": 0, "default": 36 },
        "footerHeight": { "type": "number", "minimum": 0, "default": 36 }
      }
    },
    "typographyDefaults": {
      "type": "object",
      "required": ["fontFamily", "fontType", "fontSize", "lineHeightMultiplier"],
      "properties": {
        "fontFamily": { "type": "string", "example": "Inter" },
        "fontType": {
          "type": "string",
          "enum": ["proportional", "fixed"],
          "description": "Fixed uses single character advance width; proportional requires canvas/glyph metrics."
        },
        "fontSize": { "type": "number", "minimum": 1, "example": 12 },
        "lineHeightMultiplier": { "type": "number", "minimum": 0.5, "example": 1.2 },
        "fixedCharacterWidth": {
          "type": "number",
          "description": "Advance width per character if fontType is fixed.",
          "example": 7.2
        }
      }
    },
    "documentAST": {
      "type": "array",
      "description": "Sequential stream of document nodes.",
      "items": {
        "$ref": "#/definitions/ASTNode"
      }
    },
    "paginatedOutput": {
      "type": "array",
      "description": "Read-only generated layout output mapping lines to specific visual pages.",
      "items": {
        "$ref": "#/definitions/PageOutput"
      }
    }
  },
  "definitions": {
    "ASTNode": {
      "type": "object",
      "required": ["id", "type"],
      "properties": {
        "id": { "type": "string" },
        "type": {
          "type": "string",
          "enum": ["paragraph", "manual_page_break", "header", "footer"]
        },
        "text": { "type": "string", "description": "Raw character content for paragraphs." },
        "styleOverrides": {
          "type": "object",
          "properties": {
            "fontSize": { "type": "number" },
            "fontType": { "type": "string", "enum": ["proportional", "fixed"] },
            "lineHeightMultiplier": { "type": "number" },
            "marginTop": { "type": "number", "default": 0 },
            "marginBottom": { "type": "number", "default": 0 },
            "paddingTop": { "type": "number", "default": 0 },
            "paddingBottom": { "type": "number", "default": 0 }
          }
        },
        "paginationRules": {
          "type": "object",
          "description": "Widow and Orphan constraints per block node.",
          "required": ["orphans", "widows", "keepWithNext"],
          "properties": {
            "orphans": {
              "type": "integer",
              "minimum": 1,
              "default": 2,
              "description": "Minimum lines that must remain on the preceding page when split."
            },
            "widows": {
              "type": "integer",
              "minimum": 1,
              "default": 2,
              "description": "Minimum lines that must be carried over to the next page when split."
            },
            "keepWithNext": {
              "type": "boolean",
              "default": false,
              "description": "Prevents page break between this block and the following block (e.g. headings)."
            }
          }
        }
      }
    },
    "LineBox": {
      "type": "object",
      "description": "A single calculated visual line of text.",
      "required": ["lineIndex", "text", "width", "height", "baselineY"],
      "properties": {
        "lineIndex": { "type": "integer" },
        "text": { "type": "string" },
        "width": { "type": "number" },
        "height": { "type": "number" },
        "baselineY": { "type": "number" }
      }
    },
    "PageOutput": {
      "type": "object",
      "required": ["pageIndex", "usableHeight", "renderedBlocks"],
      "properties": {
        "pageIndex": { "type": "integer" },
        "usableHeight": { "type": "number" },
        "renderedBlocks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["nodeId", "lines", "startY", "endY"],
            "properties": {
              "nodeId": { "type": "string" },
              "startY": { "type": "number" },
              "endY": { "type": "number" },
              "lines": {
                "type": "array",
                "items": { "$ref": "#/definitions/LineBox" }
              }
            }
          }
        }
      }
    }
  }
}
```
```

