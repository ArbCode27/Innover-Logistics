import { NextRequest, NextResponse } from "next/server";
import {
  getScanSessionByToken,
  updateScanSessionStatus,
  getLatestCapture,
} from "@/actions/scan";
import type { ScanSessionStatus } from "@/types/scan";

export const runtime = "nodejs";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> => {
  try {
    const { token } = await params;
    const { session, location, profile } = await getScanSessionByToken(token);
    const latestCapture = await getLatestCapture(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Sesión de escáner no encontrada o expirada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
      location: location
        ? { id: location.id, name: location.name, code: location.code }
        : null,
      userName: profile?.full_name || "Operador de Bodega",
      latestCapture,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al verificar sesión" },
      { status: 500 }
    );
  }
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> => {
  try {
    const { token } = await params;
    const body = await request.json();
    const { status, deviceInfo } = body as {
      status: ScanSessionStatus;
      deviceInfo?: Record<string, unknown>;
    };

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Estado no proporcionado" },
        { status: 400 }
      );
    }

    const updated = await updateScanSessionStatus(token, status, deviceInfo);

    return NextResponse.json({ success: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar sesión" },
      { status: 500 }
    );
  }
};
