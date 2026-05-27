import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { displayName, username, password, adminUid } = await req.json();

    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const email = `${username}@prode.app`;
    const userRecord = await admin.auth().createUser({ email, password, displayName });

    await getFirestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      displayName,
      email,
      totalPoints: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid: userRecord.uid, email, displayName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al crear usuario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
