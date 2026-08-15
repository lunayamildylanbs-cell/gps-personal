"use client";

import { useEffect, useRef, useState } from "react";

export default function Dashboard() {

    const [token, setToken] = useState("");

    const [autorizado, setAutorizado] =
        useState(false);

    const [datos, setDatos] =
        useState(null);

    const [error, setError] =
        useState("");

    const mapaElemento = useRef(null);

    const mapa = useRef(null);

    const capaRuta = useRef(null);

    useEffect(() => {

        const guardado =
            sessionStorage.getItem(
                "gps_view_token"
            );

        if (guardado) {

            setToken(guardado);

            setAutorizado(true);
        }

    }, []);

    useEffect(() => {

        if (!autorizado || !token) {
            return;
        }

        let activo = true;

        async function cargar() {

            try {

                const respuesta = await fetch(
                    "/api/ubicacion",
                    {
                        headers: {
                            "x-view-token":
                                token
                        },

                        cache: "no-store"
                    }
                );

                if (!respuesta.ok) {

                    if (
                        respuesta.status ===
                        401
                    ) {

                        setError(
                            "Clave incorrecta"
                        );

                        sessionStorage
                            .removeItem(
                                "gps_view_token"
                            );
                    }

                    return;
                }

                const resultado =
                    await respuesta.json();

                if (activo) {

                    setDatos(resultado);

                    setError("");
                }

            } catch (error) {

                console.error(error);

                if (activo) {

                    setError(
                        "No se pudo conectar con el servidor"
                    );
                }
            }
        }

        cargar();

        const intervalo =
            setInterval(
                cargar,
                3000
            );

        return () => {

            activo = false;

            clearInterval(intervalo);
        };

    }, [autorizado, token]);

    useEffect(() => {

        if (
            !datos?.historial?.length ||
            !mapaElemento.current
        ) {
            return;
        }

        let cancelado = false;

        async function dibujarMapa() {

            const L =
                await import("leaflet");

            if (cancelado) {
                return;
            }

            const ultima =
                datos.ultima;

            if (!mapa.current) {

                mapa.current =
                    L.map(
                        mapaElemento.current
                    );

                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        maxZoom: 19,

                        attribution:
                            "&copy; OpenStreetMap contributors"
                    }
                ).addTo(
                    mapa.current
                );
            }

            if (capaRuta.current) {

                capaRuta.current.remove();
            }

            const grupo =
                L.layerGroup()
                    .addTo(
                        mapa.current
                    );

            const ahora = Date.now();

            const puntos =
                [...datos.historial]
                    .filter((item) => {
                        const tiempo =
                            new Date(item.created_at).getTime();
            
                        return ahora - tiempo <= 300000;
                    })
                    .reverse()
                    .map((item) => [
                        item.latitude,
                        item.longitude
                    ]);
            
            if (puntos.length > 1) {
                L.polyline(
                    puntos,
                    {
                        weight: 4
                    }
                ).addTo(grupo);
            }

            L.circleMarker(
                [
                    ultima.latitude,
                    ultima.longitude
                ],
                {
                    radius: 10,
                    weight: 3,
                    fillOpacity: 1
                }
            )
                .addTo(grupo)
                .bindPopup(
                    `
                    <strong>
                        ${ultima.device_id}
                    </strong>
                    <br>
                    ${ultima.latitude.toFixed(6)}
                    <br>
                    ${ultima.longitude.toFixed(6)}
                    `
                );

            if (!mapa.current._gpsInicializado) {
                mapa.current.setView(
                    [
                        ultima.latitude,
                        ultima.longitude
                    ],
                    16
                );

                mapa.current._gpsInicializado = true;
            }

            capaRuta.current =
                grupo;
        }

        dibujarMapa();

        return () => {

            cancelado = true;
        };

    }, [datos]);

    useEffect(() => {

        return () => {

            if (mapa.current) {

                mapa.current.remove();

                mapa.current = null;
            }
        };

    }, []);

    function entrar() {

        if (!token.trim()) {

            setError(
                "Introduce la clave"
            );

            return;
        }

        sessionStorage.setItem(
            "gps_view_token",
            token
        );

        setAutorizado(true);
    }

    function cerrar() {

        sessionStorage.removeItem(
            "gps_view_token"
        );

        setDatos(null);

        setAutorizado(false);

        setToken("");
    }

    if (!autorizado) {

        return (

            <main className="contenedor">

                <div className="tarjeta login">

                    <h1>
                        🌐 Monitoreo GPS
                    </h1>

                    <p>
                        Introduce la clave
                        privada del panel.
                    </p>

                    <input
                        type="password"
                        value={token}
                        onChange={(e) =>
                            setToken(
                                e.target.value
                            )
                        }
                        placeholder="Clave del panel"
                    />

                    <button
                        className="botonPrincipal"
                        onClick={entrar}
                    >
                        Entrar
                    </button>

                    {error && (

                        <p className="error">
                            {error}
                        </p>

                    )}

                </div>

            </main>
        );
    }

    const ultima =
        datos?.ultima;

    let conectado = false;

    if (ultima) {

        const diferencia =
            Date.now() -
            new Date(
                ultima.created_at
            ).getTime();

        conectado =
            diferencia < 20000;
    }

    return (

        <main className="dashboard">

            <div className="cabecera">

                <div>

                    <h1>
                        🌐 Monitoreo GPS
                    </h1>

                    <p>
                        Rastreo de mi
                        dispositivo
                    </p>

                </div>

                <button
                    className="botonSecundario"
                    onClick={cerrar}
                >
                    Salir
                </button>

            </div>

            {!ultima ? (

                <div className="tarjeta">

                    <h2>
                        Esperando ubicación...
                    </h2>

                    <p>
                        Abre /emisor desde
                        tu celular e inicia
                        el GPS.
                    </p>

                </div>

            ) : (

                <>

                    <section className="gridDatos">

                        <div className="tarjeta dato">

                            <span>
                                Estado
                            </span>

                            <strong>

                                {
                                    conectado
                                        ? "🟢 Conectado"
                                        : "🔴 Sin señal"
                                }

                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Dispositivo
                            </span>

                            <strong>
                                {
                                    ultima.device_id
                                }
                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Latitud
                            </span>

                            <strong>
                                {
                                    ultima.latitude
                                        .toFixed(6)
                                }
                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Longitud
                            </span>

                            <strong>
                                {
                                    ultima.longitude
                                        .toFixed(6)
                                }
                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Precisión
                            </span>

                            <strong>

                                {
                                    ultima.accuracy !== null
                                        ? Math.round(
                                            ultima.accuracy
                                        )
                                        : "--"
                                } m

                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Velocidad
                            </span>

                            <strong>

                                {
                                    ultima.speed !== null
                                        ? (
                                            ultima.speed *
                                            3.6
                                        ).toFixed(1)
                                        : "0.0"
                                } km/h

                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Última actualización
                            </span>

                            <strong>

                                {
                                    new Date(
                                        ultima.created_at
                                    )
                                        .toLocaleTimeString()
                                }

                            </strong>

                        </div>

                        <div className="tarjeta dato">

                            <span>
                                Registros
                            </span>

                            <strong>
                                {
                                    datos.historial
                                        .length
                                }
                            </strong>

                        </div>

                    </section>

                    <section className="tarjeta mapaTarjeta">

                        <h2>
                            Ubicación en tiempo real
                        </h2>

                        <div
                            ref={mapaElemento}
                            id="mapa"
                        />

                    </section>

                </>

            )}

            {error && (

                <p className="error">
                    {error}
                </p>

            )}

        </main>
    );
}
