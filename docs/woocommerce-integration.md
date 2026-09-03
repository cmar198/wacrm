# Integración WooCommerce → WAcrm (WhatsApp transaccional)

> **Para quién es este documento:** el agente de IA que administra el
> sitio WordPress/WooCommerce. Implementa TODO en el lado de
> WordPress. **No requiere tocar el repositorio de WAcrm** — WAcrm ya
> expone una API pública estable para esto; solo hay que llamarla.

## 1. Objetivo

Cuando pasan ciertos eventos en la tienda WooCommerce, el cliente debe
recibir un WhatsApp automático enviado por WAcrm (el CRM de WhatsApp
del negocio):

1. **Confirmación de pedido** — al crear/confirmar un pedido nuevo.
2. **Actualización de estado de pedido** — cuando cambia a "enviado",
   "completado", "cancelado", etc.
3. **Carrito abandonado** — cuando un cliente deja productos en el
   carrito sin completar la compra.

WooCommerce es quien detecta el evento y hace la llamada saliente;
WAcrm solo recibe una petición HTTP autenticada y se encarga de
encontrar/crear el contacto y enviar el WhatsApp. **No hay que
construir ningún webhook receptor nuevo** — WAcrm ya tiene el endpoint
`POST /api/v1/messages` listo para esto.

## 2. Arquitectura (resumen para no perderse)

```
WooCommerce (hook nativo) → wp_remote_post() → WAcrm API pública → WhatsApp Business API → cliente
```

- **Dirección de la llamada:** WordPress llama a WAcrm (no al revés).
  No hace falta configurar ningún "webhook entrante" en WooCommerce
  apuntando a WAcrm en el sentido clásico — es una llamada de API
  directa desde código PHP.
- **Dónde vive el código:** crear un **mu-plugin** (must-use plugin,
  se autocarga, no depende del tema activo ni de que alguien lo
  "active" en el panel):
  ```
  wp-content/mu-plugins/wacrm-integration.php
  ```
  Es la forma más nativa de WordPress de agregar integraciones a
  nivel de sitio sin acoplarse al tema.

## 3. Prerrequisitos (bloqueantes — revisar antes de programar nada)

Estos dos puntos los hace **el dueño del CRM en el panel de WAcrm**,
no el agente de WooCommerce. Si no están listos, la integración
fallará en tiempo de ejecución aunque el código esté perfecto:

1. **API key de WAcrm** — Settings → API keys → New API key, con
   scope `messages:send`. Se copia una sola vez; se guarda como
   constante en `wp-config.php`, **nunca** hardcodeada en el archivo
   del plugin ni visible en un campo de opciones sin cifrar:
   ```php
   define( 'WACRM_API_KEY', 'wacrm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' );
   define( 'WACRM_API_BASE', 'https://wacrm.cmar198.workers.dev/api/v1' );
   ```
2. **Plantillas de WhatsApp pre-aprobadas por Meta** — WhatsApp exige
   plantilla aprobada para mensajes que el negocio inicia (el cliente
   no escribió primero). Sin esto, la API de WAcrm responde
   `meta_error`. Deben existir y estar `status: approved` en WAcrm
   (Settings → WhatsApp → Message Templates) con estos nombres
   (o los que decida el dueño del negocio — solo hay que mantener
   el nombre/idioma/cantidad de variables sincronizados con el código):

   | Nombre sugerido            | Variables (`params`, en orden)                  |
   | --------------------------- | ------------------------------------------------ |
   | `order_confirmation`        | nombre cliente, número de pedido, total           |
   | `order_status_update`       | número de pedido, nuevo estado (texto legible)    |
   | `abandoned_cart_reminder`   | nombre cliente, resumen del carrito / producto    |

   Si el dueño del negocio cambia estos nombres, **ajustar el `name`
   en el código PHP para que coincida exactamente** (case-sensitive).

## 4. Contrato de la API de WAcrm (lo único que WordPress necesita saber)

Documentación completa y autoritativa en el repo de WAcrm:
`docs/public-api.md` (repo `github.com/cmar198/wacrm`). Resumen
suficiente para esta integración:

**Endpoint:** `POST https://wacrm.cmar198.workers.dev/api/v1/messages`

**Headers:**
```
Authorization: Bearer <WACRM_API_KEY>
Content-Type: application/json
```

**Body (mensaje de plantilla):**
```json
{
  "to": "+56912345678",
  "type": "template",
  "template": {
    "name": "order_confirmation",
    "language": "es",
    "params": ["Juan Pérez", "#1234", "$25.990"]
  }
}
```

- `to` **debe ser E.164** (`+` + código país + número, sin espacios ni
  guiones). WooCommerce guarda el teléfono de facturación en formato
  libre — **hay que normalizarlo antes de llamar** (ver §6).
- Respuesta éxito: `201` con `{ "data": { "message_id": ..., "contact_created": true, ... } }`.
- Respuesta error: `4xx/5xx` con `{ "error": { "code": "...", "message": "..." } }`.
  Códigos relevantes: `whatsapp_not_configured` (400),
  `meta_error` (502 — Meta rechazó el envío, revisar que la plantilla
  esté aprobada), `rate_limited` (429, ver `Retry-After`).

## 5. Los tres flujos

### 5.1 Confirmación de pedido + actualización de estado (mismo hook)

Usar **un solo hook** para ambos casos, así se evita duplicar el envío
de confirmación si también existe un hook de "gracias por tu compra":

```php
add_action( 'woocommerce_order_status_changed', 'wacrm_notify_order_status', 10, 4 );

function wacrm_notify_order_status( $order_id, $old_status, $new_status, $order ) {
    // Idempotencia: no reenviar la misma notificación dos veces
    // (WooCommerce puede disparar este hook más de una vez para la
    // misma transición, por ediciones manuales o reintentos de plugins).
    $meta_key = "_wacrm_notified_{$new_status}";
    if ( $order->get_meta( $meta_key ) ) {
        return;
    }

    $status_map = [
        'processing' => [ 'template' => 'order_confirmation' ],
        'completed'  => [ 'template' => 'order_status_update', 'label' => 'Completado' ],
        'shipped'    => [ 'template' => 'order_status_update', 'label' => 'Enviado' ], // si usan un plugin de envíos con este estado custom
        'cancelled'  => [ 'template' => 'order_status_update', 'label' => 'Cancelado' ],
        'refunded'   => [ 'template' => 'order_status_update', 'label' => 'Reembolsado' ],
    ];

    if ( ! isset( $status_map[ $new_status ] ) ) {
        return; // estado no relevante para notificar (ej. "pending", "on-hold")
    }

    $config = $status_map[ $new_status ];
    $phone  = wacrm_normalize_phone( $order->get_billing_phone() );
    if ( ! $phone ) {
        return; // sin teléfono válido, no se puede notificar
    }

    $params = $config['template'] === 'order_confirmation'
        ? [ $order->get_billing_first_name(), '#' . $order->get_order_number(), $order->get_formatted_order_total() ]
        : [ '#' . $order->get_order_number(), $config['label'] ];

    $ok = wacrm_send_template( $phone, $config['template'], $params );

    if ( $ok ) {
        $order->update_meta_data( $meta_key, true );
        $order->save();
    }
}
```

### 5.2 Carrito abandonado

WooCommerce **no dispara ningún hook nativo** para esto — hay que
resolverlo con uno de estos dos caminos (elegir el que aplique):

**A) Si ya hay un plugin de carrito abandonado instalado**
(ej. "Abandoned Cart Lite/Pro for WooCommerce" de Tyche Software,
CartFlows, etc.): revisar primero si ya está activo (`wp plugin list`
o el panel de Plugins). Si existe, engancharse a **su** acción/hook de
"carrito recuperable detectado" en vez de reinventar la detección —
cada plugin expone algo distinto, hay que revisar su documentación
específica.

**B) Si no hay plugin, implementar detección propia vía WP-Cron**
(más trabajo, usar solo si no hay plugin disponible):
```php
add_action( 'wacrm_check_abandoned_carts', 'wacrm_scan_abandoned_carts' );
if ( ! wp_next_scheduled( 'wacrm_check_abandoned_carts' ) ) {
    wp_schedule_event( time(), 'hourly', 'wacrm_check_abandoned_carts' );
}

function wacrm_scan_abandoned_carts() {
    global $wpdb;
    // Sesiones con carrito no vacío, inactivas hace 1-24h, sin pedido asociado.
    // Ajustar la ventana y la fuente de datos según lo que exponga
    // WooCommerce en esta versión (wc_get_page_id, tabla wp_woocommerce_sessions,
    // o HPOS si está activo). Marcar cada sesión notificada (custom
    // postmeta o tabla propia) para no repetir el mensaje.
}
```

### 5.3 Envío (función común)

```php
function wacrm_send_template( $phone_e164, $template_name, $params, $language = 'es' ) {
    $response = wp_remote_post( WACRM_API_BASE . '/messages', [
        'headers' => [
            'Authorization' => 'Bearer ' . WACRM_API_KEY,
            'Content-Type'  => 'application/json',
        ],
        'body'    => wp_json_encode( [
            'to'       => $phone_e164,
            'type'     => 'template',
            'template' => [
                'name'     => $template_name,
                'language' => $language,
                'params'   => $params,
            ],
        ] ),
        'timeout' => 10,
    ] );

    if ( is_wp_error( $response ) ) {
        error_log( 'WAcrm send failed: ' . $response->get_error_message() );
        return false;
    }

    $code = wp_remote_retrieve_response_code( $response );
    if ( $code >= 400 ) {
        error_log( 'WAcrm send rejected (' . $code . '): ' . wp_remote_retrieve_body( $response ) );
        return false;
    }

    return true;
}
```

## 6. Normalización de teléfono (obligatorio)

WooCommerce guarda `billing_phone` en el formato que el cliente
escribió (con o sin `+`, con o sin `0` inicial, con o sin código de
país). WAcrm espera E.164 estricto. Ejemplo para números chilenos
(ajustar el código de país si la tienda vende a otros países):

```php
function wacrm_normalize_phone( $raw ) {
    $digits = preg_replace( '/\D/', '', $raw );
    if ( empty( $digits ) ) {
        return null;
    }
    if ( str_starts_with( $digits, '56' ) ) {
        return '+' . $digits;
    }
    if ( str_starts_with( $digits, '0' ) ) {
        $digits = substr( $digits, 1 );
    }
    return '+56' . $digits;
}
```

## 7. Consideraciones importantes

- **No bloquear el checkout.** `woocommerce_order_status_changed` en
  la transición inicial de un pedido corre durante el flujo de compra
  del cliente. `wp_remote_post` con `timeout => 10` ya limita el
  impacto, pero si se nota lentitud en el checkout, mover el envío a
  Action Scheduler (`as_enqueue_async_action`, ya viene con
  WooCommerce) para que corra async fuera del request del cliente.
- **Idempotencia**: siempre marcar en meta del pedido que ya se
  notificó ese estado (ver §5.1) — evita spam al cliente si el hook
  se dispara más de una vez.
- **No filtrar la API key**: solo en `wp-config.php` como constante,
  nunca en el código del plugin si este se sube a un repo compartido
  ni en un campo de opciones visible en el admin sin cifrar.
- **Rate limit de WAcrm**: 120 req/min por key — irrelevante para una
  tienda nueva de bajo tráfico, pero si algún día se hace un envío
  masivo (ej. reactivación de carritos viejos), usar
  `POST /api/v1/broadcasts` en vez de golpear `/messages` en loop
  (ver `docs/public-api.md` del repo de WAcrm).
- **Manejo de errores**: loguear (`error_log`) toda respuesta `4xx/5xx`
  de WAcrm con el código y el pedido asociado — si `meta_error`
  aparece seguido, casi siempre es una plantilla no aprobada o mal
  nombrada (§3).
- **Ambiente de prueba**: antes de ir a producción, probar el flujo
  completo con un pedido de prueba y un número de WhatsApp propio, y
  confirmar en el dashboard de WAcrm (Inbox) que el mensaje aparece
  como enviado.

## 8. Checklist de implementación

- [ ] API key generada en WAcrm con scope `messages:send`, guardada
      en `wp-config.php`.
- [ ] Plantillas `order_confirmation`, `order_status_update`,
      `abandoned_cart_reminder` creadas y **aprobadas por Meta** en
      WAcrm.
- [ ] Archivo `wp-content/mu-plugins/wacrm-integration.php` creado con
      las funciones de §5.
- [ ] Normalización de teléfono ajustada al país real de los clientes.
- [ ] Prueba end-to-end con pedido real/de prueba y número propio.
- [ ] Confirmar en WAcrm → Inbox que el contacto y el mensaje se
      crearon correctamente.
- [ ] (Si aplica) plugin de carrito abandonado identificado o cron
      propio implementado y probado con un carrito de prueba.
