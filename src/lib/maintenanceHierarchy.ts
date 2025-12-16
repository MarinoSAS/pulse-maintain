// Maintenance type hierarchy - defines which types "include" others
// When a Service is done, it also counts as completing Oil Change, Filter Change, etc.
export const MAINTENANCE_INCLUDES: Record<string, string[]> = {
  "Service": ["Oil Change", "Filter Change"],
  "Major Service": ["Oil Change", "Service", "Filter Change", "Brake Inspection"],
  "Full Service": ["Oil Change", "Service", "Filter Change", "Brake Inspection", "Tire Rotation"],
};

/**
 * Check if an expense category fulfills a maintenance requirement
 * @param expenseCategory - The category of the expense (e.g., "Service")
 * @param requiredType - The maintenance type requirement (e.g., "Oil Change")
 * @returns true if the expense fulfills the requirement
 */
export function expenseFulfillsRequirement(
  expenseCategory: string,
  requiredType: string
): boolean {
  const expenseType = expenseCategory.toLowerCase();
  const required = requiredType.toLowerCase();
  
  // Direct match
  if (expenseType === required) return true;
  
  // Check if expense type includes required type
  const includedTypes = MAINTENANCE_INCLUDES[expenseCategory] || [];
  return includedTypes.some(t => t.toLowerCase() === required);
}

/**
 * Find matching expenses for a maintenance requirement, considering hierarchy
 * @param expenses - List of expenses to search
 * @param maintenanceType - The maintenance type requirement
 * @param assetId - Optional asset ID to filter by
 * @returns Filtered expenses that fulfill the requirement
 */
export function findMatchingExpenses<T extends { category: string; asset_id?: string }>(
  expenses: T[],
  maintenanceType: string,
  assetId?: string
): T[] {
  return expenses.filter((e) => {
    if (assetId && e.asset_id !== assetId) return false;
    return expenseFulfillsRequirement(e.category, maintenanceType);
  });
}
