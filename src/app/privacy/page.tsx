import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Página pública de Política de Privacidad, requerida por Meta para
// activar la app de WhatsApp Business (App Review pide una URL de
// políticas de privacidad accesible sin iniciar sesión). Vive fuera
// de (auth) y (dashboard) a propósito: no debe redirigir a /login ni
// exigir sesión — el middleware solo protege rutas explícitamente
// listadas en `protectedPaths`, y /privacy no está en esa lista.
export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo este CRM recopila, usa y protege los datos de contactos y conversaciones de WhatsApp.",
  robots: {
    index: true,
    follow: true,
  },
};

const CONTACT_EMAIL = "cmar198@gmail.com";
const LAST_UPDATED = "1 de septiembre de 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Política de Privacidad
            </h1>
            <p className="text-sm text-muted-foreground">
              Última actualización: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <div className="space-y-8 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground sm:p-8">
          <section className="space-y-2">
            <p>
              Este CRM (&quot;el sistema&quot;) es una herramienta interna que
              permite gestionar conversaciones de WhatsApp con clientes a
              través de la API de WhatsApp Business de Meta. Esta política
              explica qué información se recopila a través del sistema, cómo
              se utiliza, cómo se protege y qué derechos tienen los titulares
              de esos datos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              1. Qué información recopilamos
            </h2>
            <p>A través del uso normal del CRM se procesan estos datos:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">
                  Datos de contacto:
                </span>{" "}
                número de teléfono de WhatsApp, nombre de perfil y, cuando el
                cliente lo entrega voluntariamente en la conversación, correo
                electrónico, dirección u otros datos de contacto.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Contenido de las conversaciones:
                </span>{" "}
                los mensajes de texto, imágenes, documentos, ubicaciones y
                otros archivos multimedia intercambiados entre el cliente y el
                negocio a través de WhatsApp.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Metadatos de la conversación:
                </span>{" "}
                fecha y hora de los mensajes, estado de entrega/lectura, y la
                etapa del embudo o pipeline en la que se encuentra el
                contacto.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Datos de las cuentas de usuario del CRM:
                </span>{" "}
                correo electrónico y credenciales de las personas del equipo
                que operan el sistema (agentes/administradores), no de los
                clientes finales.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              2. Cómo usamos esta información
            </h2>
            <p>Los datos recopilados se utilizan únicamente para:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Responder y dar seguimiento a las conversaciones de WhatsApp
                iniciadas por el propio cliente.
              </li>
              <li>
                Organizar contactos, historial de conversación y estado
                comercial (por ejemplo, en un pipeline de ventas) dentro del
                CRM.
              </li>
              <li>
                Enviar mensajes o plantillas autorizadas por WhatsApp
                relacionados con pedidos, soporte o comunicaciones que el
                cliente haya solicitado o aceptado.
              </li>
              <li>
                Mejorar la atención al cliente y el funcionamiento interno del
                negocio.
              </li>
            </ul>
            <p>
              No vendemos, alquilamos ni compartimos los datos de los
              contactos con terceros con fines publicitarios.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              3. Con quién se comparte la información
            </h2>
            <p>Los datos solo se comparten con:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">Meta / WhatsApp Business Platform</span>,
                como proveedor de la infraestructura de mensajería, conforme a
                sus propias condiciones y políticas de datos.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Proveedores de infraestructura técnica
                </span>{" "}
                usados para alojar el sistema y su base de datos (hosting y
                base de datos), únicamente en su rol de encargados técnicos
                del tratamiento.
              </li>
              <li>
                Las personas del equipo del negocio con acceso autorizado al
                CRM, para atender las conversaciones.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              4. Conservación de los datos
            </h2>
            <p>
              Los datos de contactos y conversaciones se conservan mientras
              exista una relación comercial o de atención con el cliente, o
              hasta que este solicite su eliminación. Las cuentas de usuario
              del equipo se conservan mientras la persona forme parte del
              negocio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              5. Seguridad
            </h2>
            <p>
              El acceso al CRM requiere autenticación y está restringido al
              equipo autorizado del negocio. Las conexiones al sistema viajan
              cifradas (HTTPS/TLS) y la base de datos aplica controles de
              acceso a nivel de fila para separar los datos por cuenta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              6. Derechos del titular de los datos
            </h2>
            <p>
              Cualquier persona cuyos datos hayan sido registrados a través de
              una conversación de WhatsApp puede solicitar en cualquier
              momento:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Acceder a los datos que tenemos sobre ella.</li>
              <li>Solicitar su corrección si están desactualizados.</li>
              <li>
                Solicitar la eliminación de sus datos y su historial de
                conversación.
              </li>
              <li>
                Oponerse al uso de sus datos para fines distintos a la
                atención directa de su conversación.
              </li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escribe a{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-primary/80"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              7. Menores de edad
            </h2>
            <p>
              Este canal de atención no está dirigido a menores de edad. No
              solicitamos deliberadamente datos de menores a través de
              WhatsApp.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              8. Cambios a esta política
            </h2>
            <p>
              Esta política puede actualizarse periódicamente. La fecha de la
              última actualización se indica al inicio de esta página.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              9. Contacto
            </h2>
            <p>
              Para consultas sobre esta política o sobre el tratamiento de tus
              datos, contáctanos en{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-primary/80"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:text-primary/80">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
