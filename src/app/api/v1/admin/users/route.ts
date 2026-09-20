import { NextRequest, NextResponse } from "next/server";
import { INITIAL_USERS, AdminUser } from "@/lib/admin-store";

let users: AdminUser[] = [...INITIAL_USERS];

export async function GET() {
  return NextResponse.json({
    status: "ok",
    realm: "ilcms",
    totalUsers: users.length,
    users,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, username, role, department, password, mfaEnabled } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Nafn, netfang og hlutverk eru áskilin." },
        { status: 400 }
      );
    }

    // Check duplicate email
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json(
        { error: `Notandi með netfangið ${email} er þegar til í Keycloak.` },
        { status: 409 }
      );
    }

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: (username || email.split("@")[0]).toLowerCase().trim(),
      role: role || "LAWYER",
      enabled: true,
      mfaEnabled: mfaEnabled ?? true,
      createdDate: new Date().toISOString().split("T")[0],
      lastLogin: "Ekki enn innskráður",
      keycloakSub: `kc-sub-${Math.random().toString(36).substring(2, 9)}`,
      department: department?.trim() || "Almenn lögfræðiþjónusta",
    };

    users = [newUser, ...users];

    return NextResponse.json({
      success: true,
      user: newUser,
      users,
      message: `Notandi '${newUser.name}' stofnaður í Keycloak (Hlutverk: ${newUser.role}).`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, role, enabled, mfaEnabled, department, newPassword } = body;

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: `Notandi fannst ekki (id: ${id})` }, { status: 404 });
    }

    const current = users[userIndex];

    if (action === "reset-password") {
      return NextResponse.json({
        success: true,
        message: `Lykilorð fyrir '${current.name}' (${current.email}) hefur verið endursett í Keycloak.`,
      });
    }

    // Update fields
    users[userIndex] = {
      ...current,
      role: role ?? current.role,
      enabled: enabled ?? current.enabled,
      mfaEnabled: mfaEnabled ?? current.mfaEnabled,
      department: department ?? current.department,
    };

    return NextResponse.json({
      success: true,
      user: users[userIndex],
      users,
      message: `Notandi '${current.name}' var uppfærður í Keycloak.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user id parameter" }, { status: 400 });
    }

    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) {
      return NextResponse.json({ error: `Notandi ${id} fannst ekki.` }, { status: 404 });
    }

    if (targetUser.email === "admin@ilcms.is") {
      return NextResponse.json(
        { error: "Ekki er hægt að eyða aðal kerfisstjóra (admin@ilcms.is)." },
        { status: 403 }
      );
    }

    users = users.filter((u) => u.id !== id);

    return NextResponse.json({
      success: true,
      message: `Notanda '${targetUser.name}' (${targetUser.email}) eytt úr Keycloak.`,
      users,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
