import { expect, Page } from "@playwright/test";
import { clearAndType } from "./util";

export const defaultBudget = {
  amount: {
    personnel: "200000",
    material: "3000",
    equipment: "10000",
    "service-purchase": "100",
    rent: "161616",
    steamship: "100",
    other: "100000",
  },
  description: {
    personnel: "Tarvitsemme ihmisiä aaltoihin.",
    material: "Jari Sarasvuon aalto-VHS-kasetteja.",
    equipment: "Hankimme aaltokoneen toimistolle.",
    "service-purchase": "Ostamme alihankkijoita jatkamaan aaltojamme.",
    rent: "Vuokraamme Aalto-yliopistolta seminaaritiloja.",
    steamship: "Taksikyydit Otaniemeen.",
    other: "Vähän ylimääräistä pahan päivän varalle.",
  },
  selfFinancing: "1",
};

export type BudgetAmount = typeof defaultBudget.amount;

export interface Budget {
  amount: BudgetAmount;
  description: { [k in keyof BudgetAmount]: string };
  selfFinancing: string;
}

export type AcceptedBudget = string | Budget;

export type TalousarvioFormTable = Array<{
  description: string;
  amount: string;
}>;

export const sortedFormTable = (budgetList: TalousarvioFormTable) =>
  [...budgetList].sort((a, b) => (a.description < b.description ? 1 : -1));

const getSelectorsForType = (
  type: "hakija" | "virkailija",
  field: "amount" | "description"
): Record<keyof BudgetAmount, string> => {
  const prefix = type === "virkailija" ? "budget-edit-" : "";
  return {
    personnel: `[id='${prefix}personnel-costs-row.${field}']`,
    material: `[id='${prefix}material-costs-row.${field}']`,
    equipment: `[id='${prefix}equipment-costs-row.${field}']`,
    "service-purchase": `[id='${prefix}service-purchase-costs-row.${field}']`,
    rent: `[id='${prefix}rent-costs-row.${field}']`,
    steamship: `[id='${prefix}steamship-costs-row.${field}']`,
    other: `[id='${prefix}other-costs-row.${field}']`,
  };
};

export const fillBudget = async (
  page: Page,
  budget: Budget,
  type: "hakija" | "virkailija"
) => {
  const prefix = type === "virkailija" ? "budget-edit-" : "";

  for (const key of Object.keys(budget.amount)) {
    const budgetKey = key as keyof BudgetAmount;
    const amountSelector = getSelectorsForType(type, "amount")[budgetKey];
    await clearAndType(page, amountSelector, budget.amount[budgetKey]);
    const descriptionSelector = getSelectorsForType(type, "description")[
      budgetKey
    ];
    await page.locator(descriptionSelector).fill(budget.description[budgetKey]);
  }

  if (type === "hakija") {
    await page.fill(
      `[id='${prefix}self-financing-amount']`,
      budget.selfFinancing
    );
  }
};

export async function expectBudget(
  page: Page,
  budgetAmount: BudgetAmount,
  type: "hakija" | "virkailija"
) {
  const locators = getSelectorsForType(type, "amount");
  for (const [key, value] of Object.entries(budgetAmount))
    await expect(page.locator(locators[key as keyof BudgetAmount])).toHaveValue(
      value
    );
}
