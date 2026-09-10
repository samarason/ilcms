import { NextRequest, NextResponse } from "next/server";
import {
  retainersStore,
  calculateRetainerBalance,
  RetainerTransactionItem,
  casesStore,
} from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseItem = casesStore.find((c) => c.id === id);

    if (!caseItem) {
      return NextResponse.json(
        { error: "Mál fannst ekki." },
        { status: 404 }
      );
    }

    const balanceInfo = calculateRetainerBalance(id, retainersStore);

    return NextResponse.json({
      success: true,
      case_id: id,
      balance: {
        total_deposited: balanceInfo.totalDeposited,
        total_deducted: balanceInfo.totalDeducted,
        total_refunded: balanceInfo.totalRefunded,
        current_balance: balanceInfo.currentBalance,
      },
      transactions: balanceInfo.transactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  } catch (error: any) {
    console.error("Error fetching retainers:", error);
    return NextResponse.json(
      { error: "Gat ekki sótt tryggingafé: " + error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseItem = casesStore.find((c) => c.id === id);

    if (!caseItem) {
      return NextResponse.json(
        { error: "Mál fannst ekki." },
        { status: 404 }
      );
    }

    const body = await req.json();

    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Fjárhæð verður að vera jákvæð tala." },
        { status: 400 }
      );
    }

    const type = body.type || "deposit";
    if (!["deposit", "deduction", "refund"].includes(type)) {
      return NextResponse.json(
        { error: "Ógild tegund færslu. Verður að vera deposit, deduction eða refund." },
        { status: 400 }
      );
    }

    // If refund or deduction, ensure current balance is sufficient
    if (type !== "deposit") {
      const currentBalance = calculateRetainerBalance(id, retainersStore).currentBalance;
      if (amount > currentBalance) {
        return NextResponse.json(
          {
            error: `Ófullnægjandi innistæða á vörslureikningi. Innistæða er kr. ${currentBalance.toLocaleString(
              "is-IS"
            )}, en reynt var að færa út kr. ${amount.toLocaleString("is-IS")}.`,
          },
          { status: 400 }
        );
      }
    }

    const newTransaction: RetainerTransactionItem = {
      id: `ret-${Date.now()}`,
      case_id: id,
      type,
      amount,
      date: body.date || new Date().toISOString().split("T")[0],
      payment_method: body.payment_method || "bank_transfer",
      reference:
        body.reference ||
        (type === "deposit"
          ? "Innborgun á vörslureikning"
          : type === "refund"
          ? "Endurgreiðsla til umbjóðanda"
          : "Frádráttur af tryggingafé"),
      invoice_id: body.invoice_id || undefined,
      invoice_number: body.invoice_number || undefined,
      notes: body.notes || undefined,
      created_at: new Date().toISOString(),
    };

    retainersStore.unshift(newTransaction);

    const updatedBalance = calculateRetainerBalance(id, retainersStore);

    return NextResponse.json({
      success: true,
      message:
        type === "deposit"
          ? "Innborgun tryggingafjár skráð með góðum árangri."
          : type === "refund"
          ? "Endurgreiðsla skráð með góðum árangri."
          : "Frádráttur færður á vörslureikning.",
      transaction: newTransaction,
      balance: {
        total_deposited: updatedBalance.totalDeposited,
        total_deducted: updatedBalance.totalDeducted,
        total_refunded: updatedBalance.totalRefunded,
        current_balance: updatedBalance.currentBalance,
      },
    });
  } catch (error: any) {
    console.error("Error saving retainer transaction:", error);
    return NextResponse.json(
      { error: "Gat ekki skráð færslu: " + error?.message },
      { status: 500 }
    );
  }
}
