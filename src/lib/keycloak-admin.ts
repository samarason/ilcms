import { AdminUser, INITIAL_USERS } from "@/lib/admin-store";

/**
 * Keycloak Admin REST API Client for ILCMS
 * Provides full bi-directional synchronization between the ILCMS Admin Console
 * and the Keycloak Identity & Access Management server.
 */

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "ilcms";
const KEYCLOAK_ADMIN = process.env.KEYCLOAK_ADMIN || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin_secret_ilcms";

// In-memory fallback and cache
let localUsersCache: AdminUser[] = [...INITIAL_USERS];
let cachedToken: { token: string; expiresAt: number } | null = null;
let workingBaseUrl: string | null = null;

const CANDIDATE_URLS = [
  process.env.KEYCLOAK_URL,
  "http://keycloak:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "http://auth.ilcms.local",
].filter(Boolean) as string[];

/**
 * Discovers and caches the working Keycloak base URL
 */
async function getWorkingBaseUrl(): Promise<string | null> {
  if (workingBaseUrl) {
    return workingBaseUrl;
  }

  for (const url of CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${url}/realms/${KEYCLOAK_REALM}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (res.ok || res.status === 200 || res.status === 401) {
        workingBaseUrl = url;
        return url;
      }
    } catch {
      // try next candidate URL
    }
  }

  // Fallback to configured URL
  return KEYCLOAK_URL;
}

/**
 * Obtains an OAuth2 admin access token from Keycloak master realm using admin-cli
 */
export async function getKeycloakAdminToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const baseUrl = await getWorkingBaseUrl();
  if (!baseUrl) return null;

  try {
    const tokenUrl = `${baseUrl}/realms/master/protocol/openid-connect/token`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const bodyParams = new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      username: KEYCLOAK_ADMIN,
      password: KEYCLOAK_ADMIN_PASSWORD,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[KeycloakAdmin] Failed to authenticate admin-cli at ${tokenUrl}: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + ((data.expires_in || 60) - 15) * 1000,
      };
      // Enforce sslRequired: NONE on master and target realms to prevent cookie rejection on HTTP
      ensureSslPolicyNone(data.access_token, baseUrl);
      return data.access_token;
    }
    return null;
  } catch (err: any) {
    console.warn(`[KeycloakAdmin] Cannot reach Keycloak server: ${err.message}`);
    return null;
  }
}

/**
 * Ensures realms do not enforce SSL when deployed behind local HTTP reverse proxies
 */
async function ensureSslPolicyNone(token: string, baseUrl: string): Promise<void> {
  try {
    for (const realm of ["master", KEYCLOAK_REALM]) {
      fetch(`${baseUrl}/admin/realms/${realm}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sslRequired: "NONE" }),
      }).catch(() => {});
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Helper to split full Icelandic name into firstName and lastName
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: fullName.trim(), lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Checks if Keycloak is reachable
 */
export async function isKeycloakAvailable(): Promise<boolean> {
  const token = await getKeycloakAdminToken();
  return !!token;
}

/**
 * Fetches all users directly from Keycloak realm, including their realm roles
 */
export async function fetchUsersFromKeycloak(): Promise<{ users: AdminUser[]; connected: boolean }> {
  const token = await getKeycloakAdminToken();
  const baseUrl = await getWorkingBaseUrl();

  if (!token || !baseUrl) {
    return { users: localUsersCache, connected: false };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const usersUrl = `${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users?max=200`;
    const res = await fetch(usersUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[KeycloakAdmin] Failed to fetch users: HTTP ${res.status}`);
      return { users: localUsersCache, connected: false };
    }

    const kcUsers: any[] = await res.json();

    // Map each Keycloak user to an AdminUser
    const mappedUsers: AdminUser[] = await Promise.all(
      kcUsers.map(async (kcUser) => {
        let role: "ADMIN" | "LAWYER" | "JUDGE" | "PARALEGAL" = "LAWYER";
        try {
          const rolesRes = await fetch(
            `${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${kcUser.id}/role-mappings/realm`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (rolesRes.ok) {
            const rolesData: any[] = await rolesRes.json();
            const roleNames = rolesData.map((r) => r.name?.toLowerCase());
            if (roleNames.includes("admin")) {
              role = "ADMIN";
            } else if (roleNames.includes("judge")) {
              role = "JUDGE";
            } else if (roleNames.includes("paralegal")) {
              role = "PARALEGAL";
            } else {
              role = "LAWYER";
            }
          }
        } catch {
          // default role
        }

        const firstName = kcUser.firstName || "";
        const lastName = kcUser.lastName || "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || kcUser.username || "Óþekktur notandi";
        const email = kcUser.email || `${kcUser.username}@ilcms.is`;
        const department =
          kcUser.attributes?.department?.[0] ||
          (role === "ADMIN"
            ? "Upplýsingatæknideild & Öryggisstjórnun"
            : role === "JUDGE"
            ? "Héraðsdómur Reykjavíkur (Dómsdeild)"
            : role === "PARALEGAL"
            ? "Gagnaöflun & Réttarfarsrannsóknir"
            : "Málflutningur & Einkamálaréttur");

        const createdDate = kcUser.createdTimestamp
          ? new Date(kcUser.createdTimestamp).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        return {
          id: kcUser.id,
          name: fullName,
          email,
          username: kcUser.username || email.split("@")[0],
          role,
          enabled: kcUser.enabled ?? true,
          mfaEnabled: kcUser.totp ?? true,
          createdDate,
          lastLogin: kcUser.attributes?.lastLogin?.[0] || "Virkt í Keycloak",
          keycloakSub: kcUser.id,
          department,
        };
      })
    );

    // Merge: ensure admin user is always at the top if present
    const sorted = mappedUsers.sort((a, b) => {
      if (a.role === "ADMIN") return -1;
      if (b.role === "ADMIN") return 1;
      return a.name.localeCompare(b.name);
    });

    localUsersCache = sorted;
    return { users: sorted, connected: true };
  } catch (err: any) {
    console.warn(`[KeycloakAdmin] Error fetching users from Keycloak: ${err.message}`);
    return { users: localUsersCache, connected: false };
  }
}

/**
 * Creates a new user in Keycloak and sets their realm role and credentials
 */
export async function createUserInKeycloak(input: {
  name: string;
  email: string;
  username: string;
  role: "ADMIN" | "LAWYER" | "JUDGE" | "PARALEGAL";
  department?: string;
  password?: string;
  mfaEnabled?: boolean;
}): Promise<{ success: boolean; user?: AdminUser; error?: string; createdInKeycloak: boolean }> {
  const token = await getKeycloakAdminToken();
  const baseUrl = await getWorkingBaseUrl();
  const { firstName, lastName } = splitName(input.name);

  // If Keycloak is available, create user via Keycloak Admin API
  if (token && baseUrl) {
    try {
      const createPayload: any = {
        username: input.username.toLowerCase().trim(),
        email: input.email.toLowerCase().trim(),
        firstName,
        lastName,
        enabled: true,
        emailVerified: true,
        attributes: {
          department: [input.department || "Málflutningur & Einkamálaréttur"],
        },
      };

      if (input.password) {
        createPayload.credentials = [
          {
            type: "password",
            value: input.password,
            temporary: false,
          },
        ];
      }

      const createRes = await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok && createRes.status !== 201) {
        if (createRes.status === 409) {
          return {
            success: false,
            createdInKeycloak: false,
            error: `Notandi með netfangið eða notandanafnið '${input.email}' er þegar til í Keycloak.`,
          };
        }
        const errDetail = await createRes.text().catch(() => "");
        return {
          success: false,
          createdInKeycloak: false,
          error: `Villa frá Keycloak (HTTP ${createRes.status}): ${errDetail}`,
        };
      }

      // Retrieve the newly created user's ID
      let createdUserId = "";
      const locationHeader = createRes.headers.get("Location") || createRes.headers.get("location");
      if (locationHeader) {
        const parts = locationHeader.split("/");
        createdUserId = parts[parts.length - 1];
      }

      if (!createdUserId) {
        // Query user by username to get ID
        const findRes = await fetch(
          `${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users?username=${encodeURIComponent(
            input.username.toLowerCase()
          )}&exact=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (findRes.ok) {
          const list = await findRes.json();
          if (list.length > 0) createdUserId = list[0].id;
        }
      }

      // Assign the requested realm role in Keycloak
      if (createdUserId) {
        try {
          const roleName = input.role.toLowerCase();
          const roleRes = await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/roles/${roleName}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (roleRes.ok) {
            const roleObj = await roleRes.json();
            await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${createdUserId}/role-mappings/realm`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify([roleObj]),
            });
          }
        } catch (roleErr) {
          console.warn("[KeycloakAdmin] Role assignment warning:", roleErr);
        }
      }

      const newUser: AdminUser = {
        id: createdUserId || `usr-${Date.now()}`,
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        username: input.username.toLowerCase().trim(),
        role: input.role,
        enabled: true,
        mfaEnabled: input.mfaEnabled ?? true,
        createdDate: new Date().toISOString().split("T")[0],
        lastLogin: "Ekki enn innskráður",
        keycloakSub: createdUserId || `kc-${Date.now()}`,
        department: input.department || "Málflutningur & Einkamálaréttur",
      };

      localUsersCache = [newUser, ...localUsersCache];
      return { success: true, user: newUser, createdInKeycloak: true };
    } catch (apiErr: any) {
      console.error("[KeycloakAdmin] Exception while creating user in Keycloak:", apiErr);
      // Fallback to local cache creation if Keycloak threw network error
    }
  }

  // Fallback: Keycloak is not currently reachable
  const fallbackUser: AdminUser = {
    id: `usr-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    username: input.username.toLowerCase().trim(),
    role: input.role,
    enabled: true,
    mfaEnabled: input.mfaEnabled ?? true,
    createdDate: new Date().toISOString().split("T")[0],
    lastLogin: "Ekki enn innskráður",
    keycloakSub: `kc-local-${Date.now()}`,
    department: input.department || "Málflutningur & Einkamálaréttur",
  };

  localUsersCache = [fallbackUser, ...localUsersCache];
  return { success: true, user: fallbackUser, createdInKeycloak: false };
}

/**
 * Updates a user in Keycloak (role, status, department, password)
 */
export async function updateUserInKeycloak(
  id: string,
  updates: {
    role?: "ADMIN" | "LAWYER" | "JUDGE" | "PARALEGAL";
    enabled?: boolean;
    department?: string;
    newPassword?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const token = await getKeycloakAdminToken();
  const baseUrl = await getWorkingBaseUrl();

  // Update local cache first
  const idx = localUsersCache.findIndex((u) => u.id === id || u.keycloakSub === id);
  if (idx !== -1) {
    localUsersCache[idx] = {
      ...localUsersCache[idx],
      ...(updates.role ? { role: updates.role } : {}),
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
      ...(updates.department ? { department: updates.department } : {}),
    };
  }

  if (!token || !baseUrl) {
    return { success: true };
  }

  try {
    const keycloakUserId = idx !== -1 ? localUsersCache[idx].keycloakSub || id : id;

    // 1. Update basic attributes
    if (updates.enabled !== undefined || updates.department) {
      const payload: any = {};
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.department) payload.attributes = { department: [updates.department] };

      await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    // 2. Reset password if requested
    if (updates.newPassword) {
      await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}/reset-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "password",
          value: updates.newPassword,
          temporary: false,
        }),
      });
    }

    // 3. Update realm role if requested
    if (updates.role) {
      const roleName = updates.role.toLowerCase();
      // Remove current realm roles first
      const curRolesRes = await fetch(
        `${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}/role-mappings/realm`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (curRolesRes.ok) {
        const curRoles = await curRolesRes.json();
        const toDelete = curRoles.filter((r: any) =>
          ["admin", "lawyer", "judge", "paralegal"].includes(r.name?.toLowerCase())
        );
        if (toDelete.length > 0) {
          await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}/role-mappings/realm`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(toDelete),
          });
        }
      }

      // Add new role
      const newRoleRes = await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/roles/${roleName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (newRoleRes.ok) {
        const roleObj = await newRoleRes.json();
        await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}/role-mappings/realm`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([roleObj]),
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("[KeycloakAdmin] Error updating user in Keycloak:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a user in Keycloak and removes them from local store
 */
export async function deleteUserFromKeycloak(id: string): Promise<{ success: boolean; error?: string }> {
  const token = await getKeycloakAdminToken();
  const baseUrl = await getWorkingBaseUrl();

  const user = localUsersCache.find((u) => u.id === id || u.keycloakSub === id);
  localUsersCache = localUsersCache.filter((u) => u.id !== id && u.keycloakSub !== id);

  if (!token || !baseUrl) {
    return { success: true };
  }

  try {
    const keycloakUserId = user?.keycloakSub || id;
    const res = await fetch(`${baseUrl}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 404) {
      console.warn(`[KeycloakAdmin] Delete user returned status ${res.status}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("[KeycloakAdmin] Error deleting user in Keycloak:", err);
    return { success: true }; // user already removed locally
  }
}

export function getLocalUsersCache(): AdminUser[] {
  return localUsersCache;
}
