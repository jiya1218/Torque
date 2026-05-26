/**
 * LEADS MODULE LOGIC TESTER
 * This script simulates the logic implemented in the Lead Import and Assignment module
 * to verify the Round Robin algorithm and validation rules.
 */

const mockLeads = [
  { "Vehicle No": "GJ01AB1234", "Owner Name": "Rajesh Kumar", "Contact Number": "9876543210", "Insurance Expiry Date": "2024-05-01" },
  { "Vehicle No": "GJ01CD5678", "Owner Name": "Priya Sharma", "Contact Number": "9876543211", "Insurance Expiry Date": "2024-05-10" },
  { "Vehicle No": "GJ01EF9012", "Owner Name": "Amit Patel", "Contact Number": "9876543212", "Insurance Expiry Date": "2024-05-15" },
  { "Vehicle No": "GJ01GH3456", "Owner Name": "Sunita Verma", "Contact Number": "9876543213", "Insurance Expiry Date": "2024-05-20" },
  { "Vehicle No": "GJ01IJ7890", "Owner Name": "Deepak Mehta", "Contact Number": "9876543214", "Insurance Expiry Date": "2024-05-25" }
];

const mockEmployees = [
  { id: 'emp-1', name: 'Telecaller A' },
  { id: 'emp-2', name: 'Telecaller B' },
  { id: 'emp-3', name: 'Telecaller C' }
];

function testRoundRobin() {
  console.log("--- Testing Round Robin Assignment ---");
  const assignments = {};
  
  mockLeads.forEach((lead, index) => {
    const assignee = mockEmployees[index % mockEmployees.length];
    if (!assignments[assignee.name]) assignments[assignee.name] = 0;
    assignments[assignee.name]++;
    console.log(`Lead ${lead["Vehicle No"]} -> Assigned to: ${assignee.name}`);
  });

  console.log("\nAssignment Summary:");
  Object.entries(assignments).forEach(([name, count]) => {
    console.log(`${name}: ${count} leads`);
  });
}

function testValidation() {
  console.log("\n--- Testing Data Validation ---");
  const badLeads = [
    { "Vehicle No": "", "Owner Name": "Missing No" }, // Invalid
    { "Vehicle No": "GJ01AB1234", "Owner Name": "Duplicate" } // Duplicate (based on mockLeads[0])
  ];

  const vehicleSet = new Set(mockLeads.map(l => l["Vehicle No"]));
  
  badLeads.forEach(row => {
    if (!row["Vehicle No"] || !row["Owner Name"]) {
      console.log(`❌ Validation Failed: Missing mandatory fields for ${row["Owner Name"]}`);
    } else if (vehicleSet.has(row["Vehicle No"])) {
      console.log(`❌ Validation Failed: Duplicate Vehicle No found: ${row["Vehicle No"]}`);
    }
  });
}

testRoundRobin();
testValidation();
