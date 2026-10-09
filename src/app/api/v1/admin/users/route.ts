import { NextRequest, NextResponse } from "next/server";
import { AdminUser } from "@/lib/admin-store";
import {
  fetchUsersFromKeycloak,
  createUserInKeycloak,
  updateUserInKeycloak,
  deleteUserFromKeycloak,
} from "@/lib/keycloak-admin";

export async function GET() {
  try {
    const { users, connected } = await fetchUsersFromKeycloak();
    return NextResponse.json({
      status: "ok",
      realm: "ilcms",
      totalUsers: users.length,
      keycloakConnected: connected,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
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

    const result = await createUserInKeycloak({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: (username || email.split("@")[0]).toLowerCase().trim(),
      role: role || "LAWYER",
      department: department?.trim() || "Málflutningur & Einkamálaréttur",
      password: password || "Ilcms2026!Secret",
      mfaEnabled: mfaEnabled ?? true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Mistókst að stofna notanda í Keycloak." },
        { status: 400 }
      );
    }

    const { users, connected } = await fetchUsersFromKeycloak();

    const statusMsg = result.createdInKeycloak
      ? `Notandi '${result.user?.name}' stofnaður í Keycloak realm 'ilcms' (Hlutverk: ${result.user?.role}).`
      : `Notandi '${result.user?.name}' vistaður í staðbundið minni (Keycloak tenging ekki virk).`;

    return NextResponse.json({
      success: true,
      user: result.user,
      users,
      keycloakConnected: connected,
      createdInKeycloak: result.createdInKeycloak,
      message: statusMsg,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, role, enabled, department, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const { users: currentUsers } = await fetchUsersFromKeycloak();
    const targetUser = currentUsers.find((u) => u.id === id || u.keycloakSub === id);

    if (targetUser && (targetUser.email === "admin@ilcms.is" || targetUser.role === "ADMIN")) {
      if (role && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Ekki er hægt að breyta hlutverki aðal kerfisstjóra (ADMIN)." },
          { status: 403 }
        );
      }
      if (enabled === false) {
        return NextResponse.json(
          { error: "Ekki er hægt að gera aðal kerfisstjóra (ADMIN) óvirkan." },
          { status: 403 }
        );
      }
    }

    if (action === "reset-password") {
      await updateUserInKeycloak(id, { newPassword: newPassword || "NýttLykilorð2026!" });
      return NextResponse.json({
        success: true,
        message: `Lykilorð fyrir '${targetUser?.name || id}' hefur verið endursett í Keycloak.`,
      });
    }

    const updateRes = await updateUserInKeycloak(id, {
      role,
      enabled,
      department,
      newPassword,
    });

    if (!updateRes.success) {
      return NextResponse.json({ error: updateRes.error || "Uppfærsla mistókst" }, { status: 400 });
    }

    const { users, connected } = await fetchUsersFromKeycloak();

    return NextResponse.json({
      success: true,
      users,
      keycloakConnected: connected,
      message: `Notandi '${targetUser?.name || id}' var uppfærður í Keycloak.`,
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

    const { users: currentUsers } = await fetchUsersFromKeycloak();
    const targetUser = currentUsers.find((u) => u.id === id || u.keycloakSub === id);

    if (targetUser && targetUser.email === "admin@ilcms.is") {
      return NextResponse.json(
        { error: "Ekki er hægt að eyða aðal kerfisstjóra (admin@ilcms.is)." },
        { status: 403 }
      );
    }

    await deleteUserFromKeycloak(id);
    const { users, connected } = await fetchUsersFromKeycloak();

    return NextResponse.json({
      success: true,
      message: `Notanda '${targetUser?.name || id}' eytt úr Keycloak.`,
      users,
      keycloakConnected: connected,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
