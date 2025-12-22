const fs = require('fs');
const path = require('path');

// Target file
const targetPath = path.join(__dirname, '../../src/pages/Results.tsx');

if (!fs.existsSync(targetPath)) {
    console.error("Target file not found:", targetPath);
    process.exit(1);
}

let content = fs.readFileSync(targetPath, 'utf8');

// Debug Panel JSX
const debugPanel = `
      {/* DEBUG PANEL - VISIBLE TO USER FOR DIAGNOSTICS */}
      <div className="mt-8 p-4 bg-gray-100 border-2 border-red-300 rounded text-xs font-mono overflow-auto max-h-96">
        <h3 className="font-bold text-red-600 mb-2">🛠️ DEBUG DATA (Invia screenshot di questo se vedi N/D)</h3>
        <p><strong>Provider:</strong> {targetData?.current?.provider}</p>
        <p><strong>Offer Name:</strong> {targetData?.current?.offer_name}</p>
        <p><strong>Price/kWh:</strong> {targetData?.current?.details?.price_kwh ?? "NULL"}</p>
        <p><strong>Fixed Fee:</strong> {targetData?.current?.details?.fixed_fee_monthly ?? "NULL"}</p>
        <p><strong>Calculated Unit Price (Frontend):</strong> {currentPriceKwh ?? "NULL"}</p>
        <details>
           <summary className="cursor-pointer font-bold mt-2">📦 Raw JSON (Click to expand)</summary>
           <pre>{JSON.stringify(targetData, null, 2)}</pre>
        </details>
      </div>
`;

// Insertion point: before the closing of the main container div (which is usually near the end of the return statement)
// Look for the closing of MethodSection or ReferralCard, or just before the final </div> of the component
// The file ends with:
//     </div>
//   );
// };
// export default Results;

const lastDivIndex = content.lastIndexOf("</div>");
const secondLastDivIndex = content.lastIndexOf("</div>", lastDivIndex - 1);
// This is risky. Let's look for a known anchor.
// <RedirectPopup ... /> is usually near the end.

const anchor = "<RedirectPopup";
const anchorIndex = content.lastIndexOf(anchor);

if (anchorIndex !== -1) {
    // Find the closing of RedirectPopup self-closing tag "/>"
    const closeIndex = content.indexOf("/>", anchorIndex);
    if (closeIndex !== -1) {
        // Insert after RedirectPopup
        const insertPos = closeIndex + 2;
        const newContent = content.slice(0, insertPos) + debugPanel + content.slice(insertPos);
        fs.writeFileSync(targetPath, newContent);
        console.log("Debug panel injected successfully.");
    } else {
        console.error("Could not find closing of RedirectPopup");
    }
} else {
    // Fallback: Try to replace the last closing div of the main return
    // Assuming structure: return ( <div ...> ... </div> );
    // We can replace the last </div> before ); with debugPanel + </div>
    const retEnd = content.lastIndexOf(");");
    if (retEnd !== -1) {
        const lastDiv = content.lastIndexOf("</div>", retEnd);
        if (lastDiv !== -1) {
            const newContent = content.slice(0, lastDiv) + debugPanel + content.slice(lastDiv);
            fs.writeFileSync(targetPath, newContent);
            console.log("Debug panel injected via fallback.");
        } else {
            console.error("Could not find closing div");
        }
    } else {
        console.error("Could not find return statement end");
    }
}
