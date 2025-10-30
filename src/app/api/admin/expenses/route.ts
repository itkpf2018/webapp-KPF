import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  note?: string;
};

type ExpenseEntry = {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  store: string;
  baseline: number;
  currency: string;
  items: ExpenseItem[];
  effectiveMonth: string;
  lastUpdated: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "expenses.json");

async function readExpenses(): Promise<ExpenseEntry[]> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => ({
      ...entry,
      items: Array.isArray(entry?.items) ? entry.items : [],
    })) as ExpenseEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    console.warn("Failed to read expenses data", error);
    return [];
  }
}

async function writeExpenses(expenses: ExpenseEntry[]) {
  await writeFile(DATA_PATH, JSON.stringify(expenses, null, 2), "utf-8");
}

export async function GET() {
  const expenses = await readExpenses();
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { expense?: ExpenseEntry };
    const expense = body.expense;
    if (!expense || typeof expense.id !== "string") {
      return NextResponse.json(
        { message: "payload ??????????" },
        { status: 400 },
      );
    }

    const expenses = await readExpenses();
    const index = expenses.findIndex((entry) => entry.id === expense.id);
    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.push(expense);
    }
    await writeExpenses(expenses);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Failed to persist expenses", error);
    return NextResponse.json(
      { message: "????????????????????????????" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { message: "??????????????????????????????" },
        { status: 400 },
      );
    }

    const expenses = await readExpenses();
    const next = expenses.filter((expense) => expense.id !== id);
    await writeExpenses(next);
    return NextResponse.json({ expenses: next });
  } catch (error) {
    console.error("Failed to delete expense", error);
    return NextResponse.json(
      { message: "????????????????????????" },
      { status: 500 },
    );
  }
}
