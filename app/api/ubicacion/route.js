import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISPOSITIVO = "celular_01";

function compararSeguro(valor, esperado) {
    if (!valor || !esperado) {
        return false;
    }

    const a = Buffer.from(valor);
    const b = Buffer.from(esperado);

    if (a.length !== b.length) {
        return false;
    }

    return timingSafeEqual(a, b);
}

export async function POST(request) {
    try {
        const token = request.headers.get("x-device-token");

        if (!compararSeguro(token, process.env.DEVICE_TOKEN)) {
            return Response.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const datos = await request.json();

        const latitude = Number(datos.latitude);
        const longitude = Number(datos.longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return Response.json(
                { error: "Coordenadas inválidas" },
                { status: 400 }
            );
        }

        const registro = {
            device_id: DISPOSITIVO,

            latitude: latitude,

            longitude: longitude,

            accuracy:
                Number.isFinite(Number(datos.accuracy))
                    ? Number(datos.accuracy)
                    : null,

            speed:
                Number.isFinite(Number(datos.speed))
                    ? Number(datos.speed)
                    : null,

            heading:
                Number.isFinite(Number(datos.heading))
                    ? Number(datos.heading)
                    : null
        };

        const { error } = await supabaseAdmin
            .from("ubicaciones")
            .insert(registro);

        if (error) {
            console.error(error);

            return Response.json(
                { error: "Error guardando ubicación" },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true
        });

    } catch (error) {
        console.error(error);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const token = request.headers.get("x-view-token");

        if (!compararSeguro(token, process.env.VIEW_TOKEN)) {
            return Response.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("ubicaciones")
            .select(`
                id,
                device_id,
                latitude,
                longitude,
                accuracy,
                speed,
                heading,
                created_at
            `)
            .eq("device_id", DISPOSITIVO)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(error);

            return Response.json(
                { error: "Error obteniendo ubicación" },
                { status: 500 }
            );
        }

        return Response.json(
            {
                ultima: data.length > 0 ? data[0] : null,
                historial: data
            },
            {
                headers: {
                    "Cache-Control": "no-store"
                }
            }
        );

    } catch (error) {
        console.error(error);

        return Response.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
