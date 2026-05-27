import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { displayName, username, password, adminUid } = await req.json();

    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const email = `${username}@prode.app`;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Crear usuario en Firebase Auth via REST
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.error?.message ?? "Error al crear usuario");

    const uid = authData.localId;

    // Crear documento en Firestore via REST
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: uid },
            displayName: { stringValue: displayName },
            email: { stringValue: email },
            totalPoints: { integerValue: 0 },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      }
    );

    return NextResponse.json({ uid, email, displayName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al crear usuario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
