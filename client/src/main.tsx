// Simple test without React to isolate the issue
console.log("Script loaded");

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (rootElement) {
  console.log("Setting innerHTML directly");
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; background-color: red;">
      <h1>Direct HTML Test</h1>
      <p>If you can see this, JavaScript is working!</p>
    </div>
  `;
  console.log("HTML set complete");
} else {
  console.error("Root element not found");
  document.body.innerHTML = "<h1>ROOT ELEMENT NOT FOUND</h1>";
}
