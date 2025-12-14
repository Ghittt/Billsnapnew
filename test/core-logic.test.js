/**
 * BillSnap Core Logic Tests
 * Tests for critical business logic to prevent regressions
 */

// Mock functions (these mirror the actual implementation)
function computeAnnualCost(data) {
  if (data.spesa_annua_from_bill && data.spesa_annua_from_bill > 0) {
    return { value: data.spesa_annua_from_bill, source: "BILL", valid: true };
  }
  if (data.total_due && data.total_due > 0 && data.period_months && data.period_months > 0) {
    const monthly = data.total_due / data.period_months;
    const annual = monthly * 12;
    return { value: Math.round(annual * 100) / 100, source: "CALCULATED", valid: true };
  }
  return { value: null, source: "MISSING", valid: false, error: "Missing total_due or period_months" };
}

function computeConsumptionYear(data) {
  if (data.consumo_annuo_kwh && data.consumo_annuo_kwh > 0) {
    return { value: data.consumo_annuo_kwh, was_estimated: false };
  }
  if (data.consumo_periodo_kwh && data.consumo_periodo_kwh > 0 && data.periodo_mesi && data.periodo_mesi > 0) {
    const annual = (data.consumo_periodo_kwh / data.periodo_mesi) * 12;
    return { value: Math.round(annual), was_estimated: true };
  }
  return { value: null, was_estimated: false };
}

function validateBillData(data) {
  const errors = [];
  if (!data.current_cost_year || data.current_cost_year <= 0) {
    errors.push("current_cost_year <= 0");
  }
  if (!data.consumption_year || data.consumption_year <= 0) {
    errors.push("consumption_year <= 0");
  }
  if (data.saving_year && data.current_cost_year && data.saving_year > data.current_cost_year) {
    errors.push(`IMPOSSIBLE: saving (${data.saving_year}) > current_cost (${data.current_cost_year})`);
  }
  return { valid: errors.length === 0, errors };
}

// Test framework
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message = "Assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}

// ========== TESTS ==========

// TEST 1: Bimestrale annualization
test("TEST 1: Bimestrale (€200/2mesi) → €1200/anno", () => {
  const result = computeAnnualCost({
    total_due: 200,
    period_months: 2,
    spesa_annua_from_bill: null
  });
  assert(result.value === 1200, `Expected 1200, got ${result.value}`);
  assert(result.source === "CALCULATED", `Expected CALCULATED, got ${result.source}`);
  assert(result.valid === true, "Expected valid=true");
});

// TEST 2: Mensile not divided by 2
test("TEST 2: Mensile (€100/mese) → €1200/anno NOT €600", () => {
  const result = computeAnnualCost({
    total_due: 100,
    period_months: 1,
    spesa_annua_from_bill: null
  });
  assert(result.value === 1200, `Expected 1200, got ${result.value}`);
  assert(result.value !== 600, "Should NOT be 600");
  assert(result.source === "CALCULATED");
});

// TEST 3: Consumo real vince su stima
test("TEST 3: Consumo 3000 kWh REAL vince su 250*12 STIMA", () => {
  const result = computeConsumptionYear({
    consumo_annuo_kwh: 3000,
    consumo_periodo_kwh: 250,
    periodo_mesi: 1
  });
  assert(result.value === 3000, `Expected 3000, got ${result.value}`);
  assert(result.was_estimated === false, "Should be from bill, not estimated");
});

// TEST 4: Saving <= Current Cost (Guardrail)
test("TEST 4: Saving €1200 > Cost €1000 → IMPOSSIBLE", () => {
  const validation = validateBillData({
    current_cost_year: 1000,
    consumption_year: 2700,
    saving_year: 1200
  });
  assert(validation.valid === false, "Should be invalid");
  assert(validation.errors.length > 0, "Should have errors");
  const hasImpossible = validation.errors.some(e => e.includes("IMPOSSIBLE"));
  assert(hasImpossible, `Expected IMPOSSIBLE error, got: ${validation.errors.join(', ')}`);
});

// TEST 5: Missing fields → invalid
test("TEST 5: Missing fields → { valid: false }", () => {
  const result = computeAnnualCost({
    total_due: null,
    period_months: null,
    spesa_annua_from_bill: null
  });
  assert(result.valid === false, "Should be invalid");
  assert(result.value === null, "Value should be null");
  assert(result.error === "Missing total_due or period_months", `Expected specific error, got: ${result.error}`);
});

// TEST 6: Spesa annua from bill has priority
test("TEST 6: Spesa annua da bolletta (€1500) vince su calcolo", () => {
  const result = computeAnnualCost({
    total_due: 200,
    period_months: 2,
    spesa_annua_from_bill: 1500  // This should win
  });
  assert(result.value === 1500, `Expected 1500, got ${result.value}`);
  assert(result.source === "BILL", `Expected BILL, got ${result.source}`);
  assert(result.value !== 1200, "Should NOT use calculated value");
});

// Run all tests
function runTests() {
  console.log("🧪 BillSnap Core Logic Tests\n");
  console.log("=" .repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   ${error.message}\n`);
      failed++;
    }
  }
  
  console.log("=" .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
