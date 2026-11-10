import { NextResponse } from "next/server";
import { createOrGetActiveScanSession } from "@/actions/scan";

export const runtime = "nodejs";

export const POST = async (): Promise<NextResponse> => {
  try {
    const result = await createOrGetActiveScanSession();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al iniciar sesión de escaneo" },
      { status: 500 }
    );
  }
};
