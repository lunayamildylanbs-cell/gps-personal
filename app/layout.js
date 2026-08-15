import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
    title: "GPS Personal",
    description: "Monitoreo GPS personal"
};

export default function RootLayout({
    children
}) {

    return (

        <html lang="es">

            <body>

                {children}

            </body>

        </html>
    );
}