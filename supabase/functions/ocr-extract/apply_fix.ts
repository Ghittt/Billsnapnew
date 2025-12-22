import { replace } from "https://deno.land/std@0.177.0/node/util.ts";

const indexInit = await Deno.readTextFile("./index.ts");
let index = indexInit;

// PART 1: INJECT TABLE CALL
const injectionPoint1 = `  } else if (output.bolletta_gas.presente) {
    output.tipo_fornitura = "gas";
  }`;

const injectionCode1 = `  } else if (output.bolletta_gas.presente) {
    output.tipo_fornitura = "gas";
  }

  // --- MERGE TABLE DATA ---
  try {
    const tableData = parseAzureTables(tables);
    console.log("[AZURE] Table Extraction Result:", JSON.stringify(tableData, null, 2));

    if (!output.bolletta_luce.consumi_fasce.f1 && tableData.fasce.f1) output.bolletta_luce.consumi_fasce.f1 = tableData.fasce.f1;
    if (!output.bolletta_luce.consumi_fasce.f2 && tableData.fasce.f2) output.bolletta_luce.consumi_fasce.f2 = tableData.fasce.f2;
    if (!output.bolletta_luce.consumi_fasce.f3 && tableData.fasce.f3) output.bolletta_luce.consumi_fasce.f3 = tableData.fasce.f3;

    if (!output.bolletta_luce.potenza_kw && tableData.potenza_kw) output.bolletta_luce.potenza_kw = tableData.potenza_kw;

    if (tableData.total_cost && (!foundTotalCost || foundTotalCost < 5)) {
        console.log("[AZURE] Using Total Cost from Tables:", tableData.total_cost);
        if (output.bolletta_luce.presente && !output.bolletta_gas.presente) output.bolletta_luce.totale_periodo_euro = tableData.total_cost;
        else if (output.bolletta_gas.presente && !output.bolletta_luce.presente) output.bolletta_gas.totale_periodo_euro = tableData.total_cost;
        else if (output.bolletta_luce.presente && output.bolletta_gas.presente) {
            output.bolletta_luce.totale_periodo_euro = tableData.total_cost * 0.6;
            output.bolletta_gas.totale_periodo_euro = tableData.total_cost * 0.4;
        }
    }
    
    if (!output.bolletta_luce.consumo_annuo_kwh && tableData.consumption_annuo_kwh) {
        output.bolletta_luce.consumo_annuo_kwh = tableData.consumption_annuo_kwh;
        output.bolletta_luce.presente = true;
    }
  } catch (e) {
    console.error("[AZURE] Table parsing error:", e);
  }`;

if (index.includes("parseAzureTables(tables)")) {
    console.log("Already patched part 1");
} else {
    index = index.replace(injectionPoint1, injectionCode1);
}

// PART 2: INJECT HELPER FUNCTIONS
const injectionPoint2 = `// ==================== GEMINI FALLBACK ====================`;

const injectionCode2 = `// ==================== TABLE PARSING UTILS ====================

function parseAzureTables(tables: any[]): any {
  const result = {
    fasce: { f1: null, f2: null, f3: null },
    potenza_kw: null,
    total_cost: null,
    consumption_annuo_kwh: null,
    consumption_period_kwh: null
  };

  if (!tables || tables.length === 0) return result;

  for (const table of tables) {
    const cells = table.cells;
    const getCell = (r: number, c: number) => cells.find((cell: any) => cell.rowIndex === r && cell.columnIndex === c)?.content || "";

    for (let r = 0; r < table.rowCount; r++) {
      const label = getCell(r, 0).toLowerCase().trim();
      const label2 = getCell(r, 1).toLowerCase().trim();
      const fullRow = cells.filter((c: any) => c.rowIndex === r).map((c: any) => c.content).join(" ").toLowerCase();

      // Fasce
      if (/(^|\\s)(f1|fascia 1|a1)(\\s|$)/.test(label) || /(^|\\s)(f1|fascia 1|a1)(\\s|$)/.test(label2)) {
         result.fasce.f1 = findValueInRow(cells, r, result.fasce.f1);
      } else if (/(^|\\s)(f2|fascia 2|a2)(\\s|$)/.test(label) || /(^|\\s)(f2|fascia 2|a2)(\\s|$)/.test(label2)) {
         result.fasce.f2 = findValueInRow(cells, r, result.fasce.f2);
      } else if (/(^|\\s)(f3|fascia 3|a3)(\\s|$)/.test(label) || /(^|\\s)(f3|fascia 3|a3)(\\s|$)/.test(label2)) {
         result.fasce.f3 = findValueInRow(cells, r, result.fasce.f3);
      }
      
      // Potenza
      if (fullRow.includes("potenza") && (fullRow.includes("impegnata") || fullRow.includes("contratt"))) {
         const val = findValueInRow(cells, r, null);
         if (val && val < 50) result.potenza_kw = val;
      }

      // Cost
      if (fullRow.includes("totale") && (fullRow.includes("pagare") || fullRow.includes("bolletta") || fullRow.includes("fattura"))) {
          const val = findValueInRow(cells, r, null);
          if (val && val > 5) result.total_cost = val;
      }
      
      // Consumption
      if (fullRow.includes("consumo") && fullRow.includes("annuo")) {
          const val = findValueInRow(cells, r, null);
          if (val && val > 100) result.consumption_annuo_kwh = val;
      }
    }
  }
  return result;
}

function findValueInRow(cells: any[], rowIndex: number, current: any): number | null {
    if (current !== null) return current;
    const rowCells = cells.filter((c: any) => c.rowIndex === rowIndex).sort((a: any, b: any) => a.columnIndex - b.columnIndex);
    for (let i = 1; i < rowCells.length; i++) {
        const val = parseFloat(rowCells[i].content.replace(/[^0-9,\\.]/g, "").replace(",", "."));
        if (!isNaN(val)) {
             // Heuristic: ignore years (2019-2030) unless likely consumption
             if (val > 2018 && val < 2030 && Number.isInteger(val)) continue; 
             return val;
        }
    }
    return null;
}

// ==================== GEMINI FALLBACK ====================`;

if (index.includes("function parseAzureTables")) {
    console.log("Already patched part 2");
} else {
    index = index.replace(injectionPoint2, injectionCode2);
}

await Deno.writeTextFile("./index.ts", index);
console.log("Patch applied.");
