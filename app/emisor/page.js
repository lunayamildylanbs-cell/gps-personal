"use client";

import { useEffect, useRef, useState } from "react";

export default function Emisor() {

    const [token, setToken] = useState("");

    const [activo, setActivo] = useState(false);

    const [estado, setEstado] = useState(
        "GPS detenido"
    );

    const [ubicacion, setUbicacion] = useState(null);

    const watchId = useRef(null);

    const ultimoEnvio = useRef(0);

    useEffect(() => {

        return () => {

            if (
                watchId.current !== null &&
                navigator.geolocation
            ) {
                navigator.geolocation.clearWatch(
                    watchId.current
                );
            }

        };

    }, []);

    async function enviarUbicacion(position) {

        const ahora = Date.now();

        /*
        Evita enviar cientos de solicitudes.
        Máximo una cada 5 segundos.
        */

        if (ahora - ultimoEnvio.current < 5000) {
            return;
        }

        ultimoEnvio.current = ahora;

        const coords = position.coords;

        const datos = {

            latitude: coords.latitude,

            longitude: coords.longitude,

            accuracy: coords.accuracy,

            speed:
                coords.speed !== null
                    ? coords.speed
                    : null,

            heading:
                coords.heading !== null
                    ? coords.heading
                    : null
        };

        try {

            const respuesta = await fetch(
                "/api/ubicacion",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-device-token":
                            token
                    },

                    body: JSON.stringify(datos)
                }
            );

            if (!respuesta.ok) {

                if (respuesta.status === 401) {
                    setEstado(
                        "Clave del dispositivo incorrecta"
                    );
                } else {
                    setEstado(
                        "Error enviando ubicación"
                    );
                }

                return;
            }

            setEstado(
                "Ubicación enviada correctamente"
            );

        } catch (error) {

            console.error(error);

            setEstado(
                "Sin conexión con el servidor"
            );
        }
    }

    function iniciarGPS() {

        if (!token.trim()) {

            setEstado(
                "Primero introduce la clave"
            );

            return;
        }

        if (!navigator.geolocation) {

            setEstado(
                "Este navegador no soporta GPS"
            );

            return;
        }

        setEstado(
            "Solicitando permiso de ubicación..."
        );

        watchId.current =
            navigator.geolocation.watchPosition(

                (position) => {

                    setActivo(true);

                    const coords =
                        position.coords;

                    const nuevaUbicacion = {

                        latitude:
                            coords.latitude,

                        longitude:
                            coords.longitude,

                        accuracy:
                            coords.accuracy,

                        speed:
                            coords.speed,

                        heading:
                            coords.heading
                    };

                    setUbicacion(
                        nuevaUbicacion
                    );

                    enviarUbicacion(
                        position
                    );
                },

                (error) => {

                    console.error(
                        "ERROR GPS:",
                        {
                            code:
                                error.code,

                            message:
                                error.message
                        }
                    );

                    setActivo(false);

                    if (error.code === 1) {

                        setEstado(
                            "Permiso de ubicación rechazado. Activa el permiso de ubicación para este sitio."
                        );

                    } else if (error.code === 2) {

                        setEstado(
                            "No se pudo determinar la ubicación. Comprueba que el GPS esté activado."
                        );

                    } else if (error.code === 3) {

                        setEstado(
                            "El GPS tardó demasiado en responder."
                        );

                    } else {

                        setEstado(
                            `Error GPS: ${
                                error.message ||
                                "desconocido"
                            }`
                        );
                    }
                },

                {
                    enableHighAccuracy: true,

                    timeout: 15000,

                    maximumAge: 2000
                }
            );
    }

    function detenerGPS() {

        if (watchId.current !== null) {

            navigator.geolocation.clearWatch(
                watchId.current
            );

            watchId.current = null;
        }

        setActivo(false);

        setEstado(
            "GPS detenido"
        );
    }

    return (

        <main className="contenedor">

            <div className="tarjeta emisor">

                <h1>
                    📱 Mi celular GPS
                </h1>

                <p className="descripcion">

                    Comparte la ubicación de
                    este dispositivo con tu
                    panel privado.

                </p>

                <label>
                    Clave del dispositivo
                </label>

                <input
                    type="password"
                    value={token}
                    onChange={(e) =>
                        setToken(e.target.value)
                    }
                    placeholder="DEVICE_TOKEN"
                />

                {!activo ? (

                    <button
                        className="botonPrincipal"
                        onClick={iniciarGPS}
                    >
                        Iniciar GPS
                    </button>

                ) : (

                    <button
                        className="botonDetener"
                        onClick={detenerGPS}
                    >
                        Detener GPS
                    </button>

                )}

                <div className="estadoEmisor">

                    <span
                        className={
                            activo
                                ? "punto activo"
                                : "punto"
                        }
                    />

                    {estado}

                </div>

                {ubicacion && (

                    <div className="datosGPS">

                        <div>

                            <span>
                                Latitud
                            </span>

                            <strong>
                                {
                                    ubicacion.latitude
                                        .toFixed(6)
                                }
                            </strong>

                        </div>

                        <div>

                            <span>
                                Longitud
                            </span>

                            <strong>
                                {
                                    ubicacion.longitude
                                        .toFixed(6)
                                }
                            </strong>

                        </div>

                        <div>

                            <span>
                                Precisión
                            </span>

                            <strong>
                                {
                                    Math.round(
                                        ubicacion.accuracy
                                    )
                                } m
                            </strong>

                        </div>

                        <div>

                            <span>
                                Velocidad
                            </span>

                            <strong>

                                {
                                    ubicacion.speed !== null
                                        ? (
                                            ubicacion.speed *
                                            3.6
                                        ).toFixed(1)
                                        : "0.0"
                                } km/h

                            </strong>

                        </div>

                    </div>

                )}

            </div>

        </main>
    );
}